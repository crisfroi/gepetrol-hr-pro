-- Auditable documents, editable parameter metadata, and development seed RPCs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.payroll_parameters
ADD COLUMN IF NOT EXISTS value_type text NOT NULL DEFAULT 'object'
CHECK (value_type IN ('string', 'number', 'boolean', 'object', 'array', 'null'));

ALTER TABLE public.payroll_runs
ADD COLUMN IF NOT EXISTS audit_hash text;

ALTER TABLE public.payslips
ADD COLUMN IF NOT EXISTS audit_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_runs_audit_hash_key
ON public.payroll_runs (audit_hash)
WHERE audit_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payslips_audit_hash_key
ON public.payslips (audit_hash)
WHERE audit_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.document_audit_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  entity_table text,
  entity_id uuid,
  payload_hash text NOT NULL,
  audit_hash text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.development_seed_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  requested_by uuid,
  employee_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.development_seed_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.development_seed_batches(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, entity, entity_id)
);

ALTER TABLE public.document_audit_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_seed_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_seed_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document audit: admin hr finance read" ON public.document_audit_keys;
CREATE POLICY "document audit: admin hr finance read" ON public.document_audit_keys
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr'::public.app_role)
  OR public.has_role(auth.uid(), 'finance'::public.app_role)
);

DROP POLICY IF EXISTS "document audit: admin hr finance insert" ON public.document_audit_keys;
CREATE POLICY "document audit: admin hr finance insert" ON public.document_audit_keys
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr'::public.app_role)
  OR public.has_role(auth.uid(), 'finance'::public.app_role)
);

DROP POLICY IF EXISTS "development seed: admin read batches" ON public.development_seed_batches;
CREATE POLICY "development seed: admin read batches" ON public.development_seed_batches
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "development seed: admin read records" ON public.development_seed_records;
CREATE POLICY "development seed: admin read records" ON public.development_seed_records
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_payroll_run_audit_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.audit_hash IS NULL THEN
    NEW.audit_hash := encode(digest('payroll_runs:' || NEW.id::text || ':' || COALESCE(NEW.created_at::text, now()::text), 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_payslip_audit_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.audit_hash IS NULL THEN
    NEW.audit_hash := encode(digest('payslips:' || NEW.id::text || ':' || COALESCE(NEW.created_at::text, now()::text), 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payroll_runs_audit_hash ON public.payroll_runs;
CREATE TRIGGER trg_payroll_runs_audit_hash
BEFORE INSERT OR UPDATE ON public.payroll_runs
FOR EACH ROW EXECUTE FUNCTION public.set_payroll_run_audit_hash();

DROP TRIGGER IF EXISTS trg_payslips_audit_hash ON public.payslips;
CREATE TRIGGER trg_payslips_audit_hash
BEFORE INSERT OR UPDATE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.set_payslip_audit_hash();

UPDATE public.payroll_runs
SET audit_hash = encode(digest('payroll_runs:' || id::text || ':' || created_at::text, 'sha256'), 'hex')
WHERE audit_hash IS NULL;

UPDATE public.payslips
SET audit_hash = encode(digest('payslips:' || id::text || ':' || created_at::text, 'sha256'), 'hex')
WHERE audit_hash IS NULL;

CREATE OR REPLACE FUNCTION public.track_development_seed_record(
  _batch_id uuid,
  _entity text,
  _entity_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.development_seed_records(batch_id, entity, entity_id)
  VALUES (_batch_id, _entity, _entity_id)
  ON CONFLICT DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.register_document_audit_key(
  _document_type text,
  _entity_table text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _payload_hash text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.document_audit_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.document_audit_keys;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'finance'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  v_hash := encode(digest(
    COALESCE(_document_type, '') || ':' ||
    COALESCE(_entity_table, '') || ':' ||
    COALESCE(_entity_id::text, '') || ':' ||
    COALESCE(_payload_hash, '') || ':' ||
    auth.uid()::text || ':' ||
    clock_timestamp()::text,
    'sha256'
  ), 'hex');

  INSERT INTO public.document_audit_keys(document_type, entity_table, entity_id, payload_hash, audit_hash, payload, generated_by)
  VALUES (_document_type, _entity_table, _entity_id, COALESCE(_payload_hash, v_hash), v_hash, COALESCE(_payload, '{}'::jsonb), auth.uid())
  RETURNING * INTO v_row;

  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES ('document_generated', 'document_audit_keys', v_row.id, auth.uid(), to_jsonb(v_row));

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_development_seed_data(_employee_count integer DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_departments uuid[] := ARRAY[]::uuid[];
  v_positions uuid[] := ARRAY[]::uuid[];
  v_period_start date := date_trunc('month', current_date)::date;
  v_period_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_salary numeric;
  v_deduction numeric;
  i integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can generate development data';
  END IF;

  _employee_count := LEAST(GREATEST(COALESCE(_employee_count, 12), 1), 200);

  INSERT INTO public.development_seed_batches(label, requested_by, employee_count)
  VALUES ('development payroll seed', auth.uid(), _employee_count)
  RETURNING id INTO v_batch_id;

  v_suffix := upper(left(replace(v_batch_id::text, '-', ''), 8));

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

  FOR i IN 1.._employee_count LOOP
    v_department_id := v_departments[((i - 1) % array_length(v_departments, 1)) + 1];
    v_position_id := v_positions[((i - 1) % array_length(v_positions, 1)) + 1];
    v_salary := 700000 + (i * 15000);
    v_deduction := round(v_salary * 0.0635, 2);

    INSERT INTO public.employees(
      employee_code, first_name, last_name, email, hire_date, department_id, position_id, status, nationality
    )
    VALUES (
      'DEV-' || v_suffix || '-EMP-' || lpad(i::text, 4, '0'),
      'Empleado',
      'Prueba ' || i,
      'dev.' || lower(v_suffix) || '.' || i || '@example.test',
      current_date - ((i * 17) || ' days')::interval,
      v_department_id,
      v_position_id,
      'active',
      'GQ'
    )
    RETURNING id INTO v_employee_id;
    PERFORM public.track_development_seed_record(v_batch_id, 'employees', v_employee_id);

    INSERT INTO public.employment_contracts(employee_id, contract_type, start_date, base_salary, currency, weekly_hours, calculation_method_id, active)
    VALUES (v_employee_id, 'permanent', current_date - ((i * 17) || ' days')::interval, v_salary, 'XAF', 40, v_method_id, true)
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
    'payroll_runs', 1,
    'payslips', _employee_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_development_seed_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_batches integer := 0;
  v_deleted_records integer := 0;
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can delete development data';
  END IF;

  SELECT count(*) INTO v_deleted_batches FROM public.development_seed_batches;
  SELECT count(*) INTO v_deleted_records FROM public.development_seed_records;

  DELETE FROM public.document_audit_keys
  WHERE entity_id IN (SELECT entity_id FROM public.development_seed_records WHERE entity IN ('payslips', 'payroll_runs'));

  DELETE FROM public.payment_alerts
  WHERE payslip_id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payslips');

  WITH deleted AS (DELETE FROM public.payslip_line_items WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payslip_line_items') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.payslips WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payslips') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.payroll_runs WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payroll_runs') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.employee_payroll_config WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'employee_payroll_config') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.employment_contracts WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'employment_contracts') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.employees WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'employees') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.payroll_parameters WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payroll_parameters') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.payroll_concepts WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payroll_concepts') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.payroll_calculation_methods WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'payroll_calculation_methods') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.positions WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'positions') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  WITH deleted AS (DELETE FROM public.departments WHERE id IN (SELECT entity_id FROM public.development_seed_records WHERE entity = 'departments') RETURNING 1)
  SELECT count(*) INTO v_count FROM deleted;

  DELETE FROM public.development_seed_batches;

  INSERT INTO public.audit_log(action, entity, actor_user_id, after_data)
  VALUES ('development_seed_deleted', 'development_seed_batches', auth.uid(), jsonb_build_object('deleted_batches', v_deleted_batches, 'deleted_records', v_deleted_records));

  RETURN jsonb_build_object('deleted_batches', v_deleted_batches, 'deleted_records', v_deleted_records);
END;
$$;

REVOKE ALL ON FUNCTION public.track_development_seed_record(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_document_audit_key(text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_development_seed_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_development_seed_data() TO authenticated;
