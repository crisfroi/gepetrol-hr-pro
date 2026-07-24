-- Production-ready HR ERP module tables and operational RPCs.

CREATE TABLE IF NOT EXISTS public.recruitment_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  position_id uuid REFERENCES public.positions(id),
  hiring_manager_id uuid REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'screening', 'interviewing', 'offered', 'filled', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  openings integer NOT NULL DEFAULT 1 CHECK (openings > 0),
  target_start_date date,
  budgeted_salary_min numeric,
  budgeted_salary_max numeric,
  currency text NOT NULL DEFAULT 'XAF',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruitment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid REFERENCES public.recruitment_requisitions(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  source text,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'hired', 'rejected', 'withdrawn')),
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  applied_at date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'calibration', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  metric text,
  target_value numeric,
  weight numeric NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  progress numeric NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  overall_score numeric CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'calibrated', 'approved', 'returned')),
  submitted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  provider text,
  category text,
  duration_hours numeric NOT NULL DEFAULT 0 CHECK (duration_hours >= 0),
  cost numeric NOT NULL DEFAULT 0 CHECK (cost >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'enrolled', 'in_progress', 'completed', 'cancelled')),
  enrolled_at date NOT NULL DEFAULT current_date,
  completed_at date,
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  certification_expires_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, employee_id, enrolled_at)
);

CREATE TABLE IF NOT EXISTS public.benefit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  provider text,
  coverage_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  employer_contribution numeric NOT NULL DEFAULT 0 CHECK (employer_contribution >= 0),
  employee_contribution numeric NOT NULL DEFAULT 0 CHECK (employee_contribution >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.benefit_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'ended')),
  enrolled_on date NOT NULL DEFAULT current_date,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, plan_id, effective_from)
);

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'recruitment_requisitions',
    'recruitment_candidates',
    'performance_cycles',
    'performance_goals',
    'performance_reviews',
    'training_courses',
    'training_enrollments',
    'benefit_plans',
    'employee_benefits'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', v_table, v_table);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', v_table, v_table);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "recruitment requisitions: hr read" ON public.recruitment_requisitions;
CREATE POLICY "recruitment requisitions: hr read" ON public.recruitment_requisitions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

DROP POLICY IF EXISTS "recruitment requisitions: hr write" ON public.recruitment_requisitions;
CREATE POLICY "recruitment requisitions: hr write" ON public.recruitment_requisitions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP POLICY IF EXISTS "recruitment candidates: hr read" ON public.recruitment_candidates;
CREATE POLICY "recruitment candidates: hr read" ON public.recruitment_candidates
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

DROP POLICY IF EXISTS "recruitment candidates: hr write" ON public.recruitment_candidates;
CREATE POLICY "recruitment candidates: hr write" ON public.recruitment_candidates
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP POLICY IF EXISTS "performance shared read" ON public.performance_cycles;
CREATE POLICY "performance shared read" ON public.performance_cycles
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "performance cycles hr write" ON public.performance_cycles;
CREATE POLICY "performance cycles hr write" ON public.performance_cycles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP POLICY IF EXISTS "performance goals scoped read" ON public.performance_goals;
CREATE POLICY "performance goals scoped read" ON public.performance_goals
FOR SELECT TO authenticated
USING (
  employee_id = public.current_employee_id()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr'::public.app_role)
  OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
);
DROP POLICY IF EXISTS "performance goals hr write" ON public.performance_goals;
CREATE POLICY "performance goals hr write" ON public.performance_goals
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

DROP POLICY IF EXISTS "performance reviews scoped read" ON public.performance_reviews;
CREATE POLICY "performance reviews scoped read" ON public.performance_reviews
FOR SELECT TO authenticated
USING (
  employee_id = public.current_employee_id()
  OR reviewer_id = public.current_employee_id()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr'::public.app_role)
  OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
);
DROP POLICY IF EXISTS "performance reviews hr write" ON public.performance_reviews;
CREATE POLICY "performance reviews hr write" ON public.performance_reviews
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

DROP POLICY IF EXISTS "training courses read" ON public.training_courses;
CREATE POLICY "training courses read" ON public.training_courses
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "training courses hr write" ON public.training_courses;
CREATE POLICY "training courses hr write" ON public.training_courses
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP POLICY IF EXISTS "training enrollments scoped read" ON public.training_enrollments;
CREATE POLICY "training enrollments scoped read" ON public.training_enrollments
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));
DROP POLICY IF EXISTS "training enrollments hr write" ON public.training_enrollments;
CREATE POLICY "training enrollments hr write" ON public.training_enrollments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role));

DROP POLICY IF EXISTS "benefit plans read" ON public.benefit_plans;
CREATE POLICY "benefit plans read" ON public.benefit_plans
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "benefit plans hr write" ON public.benefit_plans;
CREATE POLICY "benefit plans hr write" ON public.benefit_plans
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP POLICY IF EXISTS "employee benefits scoped read" ON public.employee_benefits;
CREATE POLICY "employee benefits scoped read" ON public.employee_benefits
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role));
DROP POLICY IF EXISTS "employee benefits hr write" ON public.employee_benefits;
CREATE POLICY "employee benefits hr write" ON public.employee_benefits
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.recruitment_requisitions,
  public.recruitment_candidates,
  public.performance_cycles,
  public.performance_goals,
  public.performance_reviews,
  public.training_courses,
  public.training_enrollments,
  public.benefit_plans,
  public.employee_benefits
TO authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_leave_balances(_year integer DEFAULT EXTRACT(year FROM current_date)::integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_emp record;
  v_type record;
  v_existing uuid;
  v_accrued numeric;
  v_used numeric;
  v_pending numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admin or HR can recalculate leave balances';
  END IF;

  FOR v_emp IN SELECT id FROM public.employees WHERE status IN ('active', 'on_leave') LOOP
    FOR v_type IN SELECT id, accrual_days_per_year FROM public.leave_types WHERE active = true LOOP
      v_accrued := public.calculate_accrued_leave(v_emp.id, v_type.id, _year);
      SELECT COALESCE(sum(days_requested), 0) INTO v_used
      FROM public.leave_requests
      WHERE employee_id = v_emp.id
        AND leave_type_id = v_type.id
        AND status = 'approved'
        AND EXTRACT(year FROM start_date) = _year;
      SELECT COALESCE(sum(days_requested), 0) INTO v_pending
      FROM public.leave_requests
      WHERE employee_id = v_emp.id
        AND leave_type_id = v_type.id
        AND status = 'submitted'
        AND EXTRACT(year FROM start_date) = _year;

      SELECT id INTO v_existing
      FROM public.leave_balances
      WHERE employee_id = v_emp.id AND leave_type_id = v_type.id AND period_year = _year
      LIMIT 1;

      IF v_existing IS NULL THEN
        INSERT INTO public.leave_balances(employee_id, leave_type_id, period_year, accrued_days, used_days, pending_days, carryover_days)
        VALUES (v_emp.id, v_type.id, _year, v_accrued, v_used, v_pending, 0);
      ELSE
        UPDATE public.leave_balances
        SET accrued_days = v_accrued,
            used_days = v_used,
            pending_days = v_pending,
            updated_at = now()
        WHERE id = v_existing;
      END IF;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.audit_log(action, entity, actor_user_id, after_data)
  VALUES ('leave_balances_recalculated', 'leave_balances', auth.uid(), jsonb_build_object('year', _year, 'rows', v_count));

  RETURN jsonb_build_object('year', _year, 'rows', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_leave_scheduling(
  _period_start date,
  _period_end date,
  _algorithm text DEFAULT 'coverage_priority'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_count integer := 0;
  v_req record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admin or HR can run leave scheduling';
  END IF;

  IF _period_end < _period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  INSERT INTO public.leave_scheduling_runs(period_start, period_end, algorithm, parameters, status, started_at, triggered_by)
  VALUES (_period_start, _period_end, COALESCE(_algorithm, 'coverage_priority'), jsonb_build_object('period_start', _period_start, 'period_end', _period_end), 'running', now(), auth.uid())
  RETURNING id INTO v_run_id;

  FOR v_req IN
    SELECT employee_id, leave_type_id, start_date, end_date, days_requested
    FROM public.leave_requests
    WHERE status IN ('submitted', 'approved')
      AND start_date <= _period_end
      AND end_date >= _period_start
    ORDER BY start_date, days_requested DESC
  LOOP
    INSERT INTO public.leave_scheduling_proposals(run_id, employee_id, leave_type_id, proposed_start, proposed_end, score, accepted)
    VALUES (v_run_id, v_req.employee_id, v_req.leave_type_id, GREATEST(v_req.start_date, _period_start), LEAST(v_req.end_date, _period_end), 100 - LEAST(v_count, 100), NULL);
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.leave_scheduling_runs
  SET status = 'completed',
      finished_at = now(),
      score = CASE WHEN v_count = 0 THEN 0 ELSE LEAST(100, 70 + v_count) END,
      updated_at = now()
  WHERE id = v_run_id;

  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES ('leave_scheduling_run_completed', 'leave_scheduling_runs', v_run_id, auth.uid(), jsonb_build_object('proposals', v_count, 'algorithm', COALESCE(_algorithm, 'coverage_priority')));

  RETURN jsonb_build_object('run_id', v_run_id, 'proposals', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_leave_balances(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_leave_scheduling(date, date, text) TO authenticated;
