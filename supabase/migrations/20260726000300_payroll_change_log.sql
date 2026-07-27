-- Create payroll_change_log table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS public.payroll_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'salary_changed', 'contract_modified', 'employee_added', 'employee_terminated',
    'bonus_added', 'deduction_changed', 'attendance_recorded', 'schedule_modified',
    'benefits_modified', 'payroll_calculated', 'payslip_generated', 'payroll_approved'
  )),
  entity_type text NOT NULL CHECK (entity_type IN (
    'employee', 'contract', 'payslip', 'payroll_run', 'attendance', 'benefit'
  )),
  entity_id uuid NOT NULL,
  old_value jsonb,
  new_value jsonb,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_change_log_payroll_run_id ON public.payroll_change_log(payroll_run_id);
CREATE INDEX idx_payroll_change_log_entity_id ON public.payroll_change_log(entity_id);
CREATE INDEX idx_payroll_change_log_changed_by ON public.payroll_change_log(changed_by);
CREATE INDEX idx_payroll_change_log_changed_at ON public.payroll_change_log(changed_at DESC);
CREATE INDEX idx_payroll_change_log_event_type ON public.payroll_change_log(event_type);

GRANT SELECT, INSERT ON public.payroll_change_log TO authenticated;
GRANT ALL ON public.payroll_change_log TO service_role;

ALTER TABLE public.payroll_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read payroll_change_log" ON public.payroll_change_log;
CREATE POLICY "auth read payroll_change_log" ON public.payroll_change_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_finance insert payroll_change_log" ON public.payroll_change_log;
CREATE POLICY "admin_finance insert payroll_change_log" ON public.payroll_change_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role));

-- Enhance payroll_runs with flexible frequency and workflow status
ALTER TABLE public.payroll_runs
ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'biweekly', 'weekly', 'custom')),
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Create index for period validation (for query performance, not uniqueness)
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period_start_end
  ON public.payroll_runs (period_start, period_end)
  WHERE status NOT IN ('cancelled', 'draft');

-- Function to log payroll changes
CREATE OR REPLACE FUNCTION public.log_payroll_change(
  _payroll_run_id uuid DEFAULT NULL,
  _event_type text,
  _entity_type text,
  _entity_id uuid,
  _old_value jsonb DEFAULT NULL,
  _new_value jsonb DEFAULT NULL,
  _change_reason text DEFAULT NULL
)
RETURNS public.payroll_change_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.payroll_change_log;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.payroll_change_log(
    payroll_run_id,
    event_type,
    entity_type,
    entity_id,
    old_value,
    new_value,
    change_reason,
    changed_by
  )
  VALUES (
    _payroll_run_id,
    _event_type,
    _entity_type,
    _entity_id,
    _old_value,
    _new_value,
    _change_reason,
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_payroll_change(uuid, text, text, uuid, jsonb, jsonb, text) TO authenticated;

-- Function to validate payroll period consistency
CREATE OR REPLACE FUNCTION public.validate_payroll_period(
  _period_start date,
  _period_end date,
  _exclude_run_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overlap_count integer;
BEGIN
  -- Check for overlapping payroll runs
  SELECT count(*)
  INTO v_overlap_count
  FROM public.payroll_runs
  WHERE status NOT IN ('cancelled')
    AND (
      (period_start <= _period_end AND period_end >= _period_start)
    )
    AND (
      _exclude_run_id IS NULL
      OR id != _exclude_run_id
    );

  RETURN v_overlap_count = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_payroll_period(date, date, uuid) TO authenticated;

-- Trigger to track contract changes in payroll log
CREATE OR REPLACE FUNCTION public.track_contract_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.base_salary IS DISTINCT FROM OLD.base_salary THEN
    PERFORM public.log_payroll_change(
      _event_type => 'salary_changed',
      _entity_type => 'contract',
      _entity_id => NEW.id,
      _old_value => jsonb_build_object('base_salary', OLD.base_salary),
      _new_value => jsonb_build_object('base_salary', NEW.base_salary),
      _change_reason => 'Salary modification'
    );
  END IF;

  IF NEW.benefits IS DISTINCT FROM OLD.benefits THEN
    PERFORM public.log_payroll_change(
      _event_type => 'benefits_modified',
      _entity_type => 'contract',
      _entity_id => NEW.id,
      _old_value => OLD.benefits,
      _new_value => NEW.benefits,
      _change_reason => 'Benefits modification'
    );
  END IF;

  IF NEW.bonification_percentage IS DISTINCT FROM OLD.bonification_percentage THEN
    PERFORM public.log_payroll_change(
      _event_type => 'bonus_added',
      _entity_type => 'contract',
      _entity_id => NEW.id,
      _old_value => jsonb_build_object('bonification_percentage', OLD.bonification_percentage),
      _new_value => jsonb_build_object('bonification_percentage', NEW.bonification_percentage),
      _change_reason => 'Bonification percentage change'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_contract_changes ON public.employment_contracts;
CREATE TRIGGER trg_track_contract_changes
  AFTER UPDATE ON public.employment_contracts
  FOR EACH ROW
  WHEN (
    NEW.base_salary IS DISTINCT FROM OLD.base_salary
    OR NEW.benefits IS DISTINCT FROM OLD.benefits
    OR NEW.bonification_percentage IS DISTINCT FROM OLD.bonification_percentage
  )
  EXECUTE FUNCTION public.track_contract_changes();

-- Trigger to track employee status changes
CREATE OR REPLACE FUNCTION public.track_employee_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'terminated' THEN
      PERFORM public.log_payroll_change(
        _event_type => 'employee_terminated',
        _entity_type => 'employee',
        _entity_id => NEW.id,
        _old_value => jsonb_build_object('status', OLD.status),
        _new_value => jsonb_build_object('status', NEW.status),
        _change_reason => 'Employee status changed to terminated'
      );
    ELSIF OLD.status IS NULL THEN
      PERFORM public.log_payroll_change(
        _event_type => 'employee_added',
        _entity_type => 'employee',
        _entity_id => NEW.id,
        _new_value => jsonb_build_object('first_name', NEW.first_name, 'last_name', NEW.last_name),
        _change_reason => 'New employee added to system'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_employee_changes ON public.employees;
CREATE TRIGGER trg_track_employee_changes
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.track_employee_changes();
