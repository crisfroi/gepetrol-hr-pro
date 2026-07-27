-- Add benefits and schedule fields to employment_contracts
ALTER TABLE public.employment_contracts
ADD COLUMN IF NOT EXISTS benefits jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS bonification_percentage numeric DEFAULT 0 CHECK (bonification_percentage >= 0 AND bonification_percentage <= 100),
ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'standard' CHECK (schedule_type IN ('standard', 'shift', 'flexible')),
ADD COLUMN IF NOT EXISTS additional_notes text;

-- Create work_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type text NOT NULL CHECK (schedule_type IN ('standard', 'shift', 'flexible')),
  name text NOT NULL,
  description text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration integer DEFAULT 60,
  hours_per_day numeric NOT NULL DEFAULT 8,
  days_per_week integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT ALL ON public.work_schedules TO service_role;

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read work_schedules" ON public.work_schedules;
CREATE POLICY "auth read work_schedules" ON public.work_schedules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_hr manage work_schedules" ON public.work_schedules;
CREATE POLICY "admin_hr manage work_schedules" ON public.work_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP TRIGGER IF EXISTS trg_work_schedules_updated_at ON public.work_schedules;
CREATE TRIGGER trg_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed standard work schedules (only if not exists)
INSERT INTO public.work_schedules (schedule_type, name, description, start_time, end_time, break_duration, hours_per_day, days_per_week, active)
SELECT * FROM (VALUES
  ('standard', 'Jornada Estándar', 'Horario de 8 horas estándar', '08:00'::time, '17:00'::time, 60, 8, 5, true),
  ('standard', 'Jornada Matutina', 'Turno matutino 6am-14pm', '06:00'::time, '14:00'::time, 60, 8, 5, true),
  ('standard', 'Jornada Vespertina', 'Turno vespertino 14pm-22pm', '14:00'::time, '22:00'::time, 60, 8, 5, true),
  ('shift', 'Turno Noche', 'Turno nocturno 22pm-06am', '22:00'::time, '06:00'::time, 60, 8, 5, true),
  ('flexible', 'Flexible', 'Horario flexible según necesidad', '06:00'::time, '20:00'::time, 60, 8, 5, true)
) AS t(schedule_type, name, description, start_time, end_time, break_duration, hours_per_day, days_per_week, active)
WHERE NOT EXISTS (SELECT 1 FROM public.work_schedules);

-- Replace the generate_development_seed_data function with an improved version
CREATE OR REPLACE FUNCTION public.generate_development_seed_data(_employee_count integer DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, reference_data
AS $$
DECLARE
  v_batch_id uuid;
  v_suffix text;
  v_department_id uuid;
  v_position_id uuid;
  v_method_id uuid;
  v_basic_concept_id uuid;
  v_deduction_concept_id uuid;
  v_run_id uuid;
  v_employee_id uuid;
  v_contract_id uuid;
  v_config_id uuid;
  v_payslip_id uuid;
  v_line_id uuid;
  v_schedule_id uuid;
  v_departments uuid[] := ARRAY[]::uuid[];
  v_positions uuid[] := ARRAY[]::uuid[];
  v_schedules uuid[] := ARRAY[]::uuid[];
  v_period_start date := date_trunc('month', current_date)::date;
  v_period_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_salary numeric;
  v_deduction numeric;
  v_first_name text;
  v_last_name text;
  v_region text;
  v_hire_date date;
  v_attendance_date date;
  v_check_in time;
  v_check_out time;
  v_absence_roll numeric;
  v_benefits jsonb;
  v_bonification numeric;
  i integer;
  j integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can generate development data';
  END IF;

  _employee_count := LEAST(GREATEST(COALESCE(_employee_count, 12), 1), 200);

  INSERT INTO public.development_seed_batches(label, requested_by, employee_count)
  VALUES ('development payroll seed', auth.uid(), _employee_count)
  RETURNING id INTO v_batch_id;

  v_suffix := upper(left(replace(v_batch_id::text, '-', ''), 8));

  -- Create 3 departments
  FOR i IN 1..3 LOOP
    INSERT INTO public.departments(code, name, cost_center, active)
    VALUES ('DEV-' || v_suffix || '-DEP-' || i, 'Departamento prueba ' || i, 'DEV-' || v_suffix || '-' || i, true)
    RETURNING id INTO v_department_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'departments', v_department_id);
    v_departments := array_append(v_departments, v_department_id);

    INSERT INTO public.positions(code, title, department_id, grade, active)
    VALUES ('DEV-' || v_suffix || '-POS-' || i, 'Puesto prueba ' || i, v_department_id, 'DEV', true)
    RETURNING id INTO v_position_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'positions', v_position_id);
    v_positions := array_append(v_positions, v_position_id);
  END LOOP;

  -- Load work schedules
  FOR v_schedule_id IN SELECT id FROM public.work_schedules WHERE active = true ORDER BY created_at LIMIT 5 LOOP
    v_schedules := array_append(v_schedules, v_schedule_id);
  END LOOP;

  INSERT INTO public.payroll_calculation_methods(code, name, formula_hint, active)
  VALUES ('DEV-' || v_suffix || '-MONTHLY', 'Metodo mensual prueba', 'base_salary mensual con conceptos configurables', true)
  RETURNING id INTO v_method_id;
  PERFORM public.track_development_seed_record(v_batch_id, 'payroll_calculation_methods', v_method_id);

  INSERT INTO public.payroll_concepts(code, name, kind, formula, taxable, active, display_order)
  VALUES ('DEV-' || v_suffix || '-BASE', 'Salario base prueba', 'earning', 'contract.base_salary', true, true, 10)
  RETURNING id INTO v_basic_concept_id;
  PERFORM public.track_development_seed_record(v_batch_id, 'payroll_concepts', v_basic_concept_id);

  INSERT INTO public.payroll_concepts(code, name, kind, formula, taxable, active, display_order)
  VALUES ('DEV-' || v_suffix || '-DED', 'Deduccion prueba', 'deduction', 'gross * parameter.dev_deduction_rate', false, true, 20)
  RETURNING id INTO v_deduction_concept_id;
  PERFORM public.track_development_seed_record(v_batch_id, 'payroll_concepts', v_deduction_concept_id);

  INSERT INTO public.payroll_parameters(key, value, value_type, description, effective_from)
  VALUES ('dev.' || lower(v_suffix) || '.deduction_rate', '0.0635'::jsonb, 'number', 'Parametro de prueba para deducciones de desarrollo', current_date)
  RETURNING id INTO v_config_id;
  PERFORM public.track_development_seed_record(v_batch_id, 'payroll_parameters', v_config_id);

  INSERT INTO public.payroll_runs(period_start, period_end, pay_date, currency, status, notes, created_by)
  VALUES (v_period_start, v_period_end, current_date, 'XAF', 'approved', 'Corrida de prueba ' || v_suffix, auth.uid())
  RETURNING id INTO v_run_id;
  PERFORM public.track_development_seed_record(v_batch_id, 'payroll_runs', v_run_id);

  -- Generate employees with real names and enhanced data
  FOR i IN 1.._employee_count LOOP
    v_department_id := v_departments[((i - 1) % array_length(v_departments, 1)) + 1];
    v_position_id := v_positions[((i - 1) % array_length(v_positions, 1)) + 1];
    v_schedule_id := v_schedules[((i - 1) % array_length(v_schedules, 1)) + 1];

    -- Generate realistic name using reference data
    v_first_name := reference_data.get_random_first_name();
    v_last_name := reference_data.get_random_last_name();
    v_region := reference_data.get_random_region();

    v_hire_date := (current_date - ((i * 17) || ' days')::interval)::date;
    v_salary := 700000 + (i * 15000);
    v_deduction := round(v_salary * 0.0635, 2);
    v_bonification := (random() * 30)::numeric;

    -- Benefits based on position grade
    v_benefits := jsonb_build_object(
      'health_insurance', true,
      'retirement_plan', true,
      'bonus_eligibility', v_bonification > 0,
      'bonus_percentage', round(v_bonification, 2),
      'meal_allowance', 50000,
      'transportation_allowance', 30000
    );

    INSERT INTO public.employees(
      employee_code, first_name, last_name, email, hire_date, department_id, position_id, status, nationality, address, phone
    )
    VALUES (
      'DEV-' || v_suffix || '-EMP-' || lpad(i::text, 4, '0'),
      v_first_name,
      v_last_name,
      lower(v_first_name) || '.' || lower(v_last_name) || '.' || i || '@example.test',
      v_hire_date,
      v_department_id,
      v_position_id,
      'active',
      'GQ',
      v_region || ', Guinea Ecuatorial',
      '+240 ' || lpad((random() * 1000000)::integer::text, 6, '0')
    )
    RETURNING id INTO v_employee_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'employees', v_employee_id);

    INSERT INTO public.employment_contracts(
      employee_id, contract_type, start_date, base_salary, currency, weekly_hours, calculation_method_id, active,
      benefits, bonification_percentage, schedule_type
    )
    VALUES (
      v_employee_id, 'permanent', v_hire_date, v_salary, 'XAF', 40, v_method_id, true,
      v_benefits, v_bonification, (ARRAY['standard', 'shift', 'flexible'])[((i - 1) % 3) + 1]
    )
    RETURNING id INTO v_contract_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'employment_contracts', v_contract_id);

    INSERT INTO public.employee_payroll_config(employee_id, calculation_method_id, overrides)
    VALUES (v_employee_id, v_method_id, jsonb_build_object('seed_batch', v_batch_id))
    RETURNING id INTO v_config_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'employee_payroll_config', v_config_id);

    INSERT INTO public.payslips(run_id, employee_id, gross, deductions, net, currency)
    VALUES (v_run_id, v_employee_id, v_salary, v_deduction, v_salary - v_deduction, 'XAF')
    RETURNING id INTO v_payslip_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'payslips', v_payslip_id);

    INSERT INTO public.payslip_line_items(payslip_id, concept_id, base_amount, quantity, amount, meta)
    VALUES (v_payslip_id, v_basic_concept_id, v_salary, 1, v_salary, jsonb_build_object('seed_batch', v_batch_id))
    RETURNING id INTO v_line_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'payslip_line_items', v_line_id);

    INSERT INTO public.payslip_line_items(payslip_id, concept_id, base_amount, quantity, amount, meta)
    VALUES (v_payslip_id, v_deduction_concept_id, v_salary, 1, v_deduction, jsonb_build_object('seed_batch', v_batch_id))
    RETURNING id INTO v_line_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'payslip_line_items', v_line_id);

    -- Generate 3 months of attendance records (90 days)
    FOR j IN 0..89 LOOP
      v_attendance_date := current_date - (90 - j)::integer;

      -- Skip weekends (0 = Sunday, 6 = Saturday)
      CONTINUE WHEN extract(dow from v_attendance_date) IN (0, 6);

      -- 2% chance of absence
      v_absence_roll := random();
      CONTINUE WHEN v_absence_roll < 0.02;

      -- Generate realistic check-in/check-out with some variation
      v_check_in := ('08:' || lpad((random() * 59)::integer::text, 2, '0') || ':00')::time;
      v_check_out := ('17:' || lpad((random() * 59)::integer::text, 2, '0') || ':00')::time;

      INSERT INTO public.attendance_records(employee_id, work_date, check_in, check_out, source, notes)
      VALUES (v_employee_id, v_attendance_date, v_check_in, v_check_out, 'manual', 'Asistencia generada para seed')
      RETURNING id INTO v_line_id;
      PERFORM public.track_development_seed_record(v_batch_id, 'attendance_records', v_line_id);
    END LOOP;
  END LOOP;

  UPDATE public.payroll_runs
  SET total_gross = (SELECT COALESCE(sum(gross), 0) FROM public.payslips WHERE run_id = v_run_id),
      total_deductions = (SELECT COALESCE(sum(deductions), 0) FROM public.payslips WHERE run_id = v_run_id),
      total_net = (SELECT COALESCE(sum(net), 0) FROM public.payslips WHERE run_id = v_run_id)
  WHERE id = v_run_id;

  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES ('development_seed_generated', 'development_seed_batches', v_batch_id, auth.uid(), jsonb_build_object('employee_count', _employee_count));

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'employees', _employee_count,
    'departments', 3,
    'positions', 3,
    'work_schedules', array_length(v_schedules, 1),
    'attendance_records', (_employee_count * 64),
    'payroll_runs', 1,
    'payslips', _employee_count
  );
END;
$$;
