-- FASE 3 & 4: Payroll calculation engine and leave optimization
-- New tables for enhanced payroll and leave management

CREATE TABLE IF NOT EXISTS payslip_calculation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  calculation_date timestamptz DEFAULT now(),
  gross_amount numeric(12, 2),
  deductions_amount numeric(12, 2),
  net_amount numeric(12, 2),
  calculation_details jsonb,
  calculated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  assigned_start date NOT NULL,
  assigned_end date NOT NULL,
  optimization_score numeric(5, 2),
  manual_override boolean DEFAULT false,
  override_reason text,
  status varchar DEFAULT 'assigned' CHECK (status IN ('assigned', 'approved', 'taken', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE payslip_calculation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_read_own_calculation_log"
  ON payslip_calculation_log FOR SELECT
  USING (
    auth.uid() = (SELECT e.user_id FROM employees e WHERE e.id = (SELECT p.employee_id FROM payslips p WHERE p.id = payslip_id)) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr'::public.app_role) OR
    public.has_role(auth.uid(), 'finance'::public.app_role)
  );

CREATE POLICY "admins_and_finance_can_write_calculation_log"
  ON payslip_calculation_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role));

CREATE POLICY "users_can_read_own_leave_assignments"
  ON leave_assignments FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM employees WHERE id = employee_id) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr'::public.app_role)
  );

CREATE POLICY "admins_and_hr_can_write_leave_assignments"
  ON leave_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_update_leave_assignments"
  ON leave_assignments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_delete_leave_assignments"
  ON leave_assignments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

-- Add audit triggers
CREATE TRIGGER audit_payslip_calculation_log AFTER INSERT OR UPDATE OR DELETE ON payslip_calculation_log
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_leave_assignments AFTER INSERT OR UPDATE OR DELETE ON leave_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Create indices
CREATE INDEX IF NOT EXISTS idx_payslip_calculation_log_payslip ON payslip_calculation_log(payslip_id);
CREATE INDEX IF NOT EXISTS idx_leave_assignments_employee ON leave_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_assignments_period ON leave_assignments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_leave_assignments_status ON leave_assignments(status);

-- Create RPC function for payroll calculation
-- This function calculates payslip amounts based on configured concepts and parameters
CREATE OR REPLACE FUNCTION calculate_payslip_amounts(_payslip_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_payslip RECORD;
  v_employee_id uuid;
  v_base_salary numeric;
  v_contract_start_date date;
  v_concept RECORD;
  v_gross_amount numeric := 0;
  v_deductions numeric := 0;
  v_net_amount numeric := 0;
  v_line_items jsonb := '[]'::jsonb;
  v_calculation_details jsonb := '{}'::jsonb;
  v_days_in_period integer;
  v_daily_rate numeric;
  v_line_amount numeric;
  v_years_service integer;
  v_seniority_bonus numeric := 0;
BEGIN
  -- Get payslip info
  SELECT * INTO v_payslip FROM payslips WHERE id = _payslip_id;
  IF v_payslip IS NULL THEN
    RAISE EXCEPTION 'Payslip not found';
  END IF;

  -- Get employee and contract info (separate queries)
  SELECT id INTO v_employee_id FROM employees WHERE id = v_payslip.employee_id;
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  SELECT base_salary, contract_start_date INTO v_base_salary, v_contract_start_date
  FROM employment_contracts
  WHERE employee_id = v_employee_id AND contract_end_date IS NULL
  LIMIT 1;

  -- Calculate days in period
  v_days_in_period := (v_payslip.period_end::date - v_payslip.period_start::date) + 1;

  -- Calculate years of service for bonuses
  IF v_contract_start_date IS NOT NULL THEN
    v_years_service := EXTRACT(YEAR FROM AGE(v_payslip.period_start::timestamp, v_contract_start_date::timestamp));
  ELSE
    v_years_service := 0;
  END IF;

  -- Seniority bonus: 5% for every 5 years
  IF v_years_service >= 5 AND v_base_salary IS NOT NULL THEN
    v_seniority_bonus := (v_base_salary * (v_years_service / 5) * 0.05);
  END IF;

  -- Process each payroll concept
  FOR v_concept IN 
    SELECT * FROM payroll_concepts 
    WHERE active = true 
    ORDER BY concept_order
  LOOP
    v_line_amount := 0;
    
    -- Calculate based on concept type
    CASE v_concept.concept_type
      WHEN 'salary' THEN
        v_line_amount := COALESCE(v_base_salary, 0);
        v_gross_amount := v_gross_amount + v_line_amount;

      WHEN 'bonus' THEN
        v_line_amount := v_seniority_bonus;
        v_gross_amount := v_gross_amount + v_line_amount;
      
      WHEN 'deduction' THEN
        v_line_amount := COALESCE((SELECT parameter_value FROM payroll_parameters WHERE concept_id = v_concept.id LIMIT 1), 0);
        v_deductions := v_deductions + v_line_amount;
      
      ELSE
        v_line_amount := 0;
    END CASE;

    -- Update or create payslip_line_item
    INSERT INTO payslip_line_items (payslip_id, concept_id, amount)
    VALUES (_payslip_id, v_concept.id, v_line_amount)
    ON CONFLICT (payslip_id, concept_id) DO UPDATE 
    SET amount = v_line_amount, updated_at = now();

    -- Track in calculation details
    v_calculation_details := jsonb_set(
      v_calculation_details,
      ARRAY[v_concept.name],
      to_jsonb(v_line_amount)
    );
  END LOOP;

  -- Calculate net amount
  v_net_amount := v_gross_amount - v_deductions;

  -- Update payslip
  UPDATE payslips 
  SET 
    gross_amount = v_gross_amount,
    deductions_amount = v_deductions,
    net_amount = v_net_amount,
    status = 'calculated',
    updated_at = now()
  WHERE id = _payslip_id;

  -- Log calculation
  INSERT INTO payslip_calculation_log (
    payslip_id, gross_amount, deductions_amount, net_amount,
    calculation_details, calculated_by
  ) VALUES (
    _payslip_id, v_gross_amount, v_deductions, v_net_amount,
    v_calculation_details, auth.uid()
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'payslip_id', _payslip_id,
    'gross_amount', v_gross_amount,
    'deductions_amount', v_deductions,
    'net_amount', v_net_amount,
    'details', v_calculation_details
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;
