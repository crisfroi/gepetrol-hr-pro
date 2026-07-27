-- Create calendar_events table for team events, meetings, holidays
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('meeting', 'holiday', 'birthday', 'company_event', 'team_event', 'personal')),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  location text,
  organizer_id uuid REFERENCES auth.users(id),
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  attendees_count integer DEFAULT 1,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX idx_calendar_events_event_type ON public.calendar_events(event_type);
CREATE INDEX idx_calendar_events_department_id ON public.calendar_events(department_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read calendar_events" ON public.calendar_events;
CREATE POLICY "auth read calendar_events" ON public.calendar_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "organizer or admin manage calendar_events" ON public.calendar_events;
CREATE POLICY "organizer or admin manage calendar_events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (
    organizer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  )
  WITH CHECK (
    organizer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create calendar_event_attendees junction table
CREATE TABLE IF NOT EXISTS public.calendar_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, employee_id)
);

CREATE INDEX idx_calendar_event_attendees_event_id ON public.calendar_event_attendees(event_id);
CREATE INDEX idx_calendar_event_attendees_employee_id ON public.calendar_event_attendees(employee_id);

GRANT SELECT, INSERT, UPDATE ON public.calendar_event_attendees TO authenticated;
GRANT ALL ON public.calendar_event_attendees TO service_role;

ALTER TABLE public.calendar_event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read calendar_event_attendees" ON public.calendar_event_attendees;
CREATE POLICY "auth read calendar_event_attendees" ON public.calendar_event_attendees
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendees update own status" ON public.calendar_event_attendees;
CREATE POLICY "attendees update own status" ON public.calendar_event_attendees
  FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id())
  WITH CHECK (employee_id = public.current_employee_id());

-- Create employee_presence table for real-time presence tracking
CREATE TABLE IF NOT EXISTS public.employee_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'away' CHECK (status IN ('in_office', 'remote', 'away', 'on_leave')),
  location text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_employee_presence_employee_id ON public.employee_presence(employee_id);
CREATE INDEX idx_employee_presence_status ON public.employee_presence(status);

GRANT SELECT, INSERT, UPDATE ON public.employee_presence TO authenticated;
GRANT ALL ON public.employee_presence TO service_role;

ALTER TABLE public.employee_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read employee_presence" ON public.employee_presence;
CREATE POLICY "auth read employee_presence" ON public.employee_presence
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "employees update own presence" ON public.employee_presence;
CREATE POLICY "employees update own presence" ON public.employee_presence
  FOR INSERT, UPDATE TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());

-- Create absence_policies table
CREATE TABLE IF NOT EXISTS public.absence_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  code text NOT NULL UNIQUE,
  is_paid boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  max_days_per_year integer,
  carryover_days integer DEFAULT 0,
  expiry_days integer,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.absence_policies TO authenticated;
GRANT ALL ON public.absence_policies TO service_role;

ALTER TABLE public.absence_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read absence_policies" ON public.absence_policies;
CREATE POLICY "auth read absence_policies" ON public.absence_policies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manage absence_policies" ON public.absence_policies;
CREATE POLICY "admin manage absence_policies" ON public.absence_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_absence_policies_updated_at ON public.absence_policies;
CREATE TRIGGER trg_absence_policies_updated_at
  BEFORE UPDATE ON public.absence_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default absence policies
INSERT INTO public.absence_policies (name, code, description, is_paid, requires_approval, max_days_per_year, expiry_days)
VALUES
  ('Vacaciones Anuales', 'ANNUAL', 'Días de descanso pagado', true, true, 21, 365),
  ('Enfermedad', 'SICK', 'Ausencia por motivo de salud', true, false, NULL, NULL),
  ('Licencia Personal', 'PERSONAL', 'Permiso personal pagado', true, true, 3, 365),
  ('Licencia Sin Pagar', 'UNPAID', 'Permiso sin remuneración', false, true, NULL, NULL),
  ('Licencia Paternal', 'PATERNAL', 'Licencia por paternidad', true, true, 10, NULL)
ON CONFLICT (code) DO NOTHING;

-- Function to get team members and their presence
CREATE OR REPLACE FUNCTION public.get_team_presence(
  _department_id uuid DEFAULT NULL
)
RETURNS TABLE (
  employee_id uuid,
  first_name text,
  last_name text,
  email text,
  position text,
  department text,
  presence_status text,
  location text,
  is_on_leave boolean,
  leave_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    p.title,
    d.name,
    COALESCE(ep.status, 'away'),
    ep.location,
    COALESCE(lr.id IS NOT NULL, false) as is_on_leave,
    lr.leave_type
  FROM public.employees e
  LEFT JOIN public.positions p ON e.position_id = p.id
  LEFT JOIN public.departments d ON e.department_id = d.id
  LEFT JOIN public.employee_presence ep ON e.id = ep.employee_id
  LEFT JOIN public.leave_requests lr ON e.id = lr.employee_id
    AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
    AND lr.status = 'approved'
  WHERE e.status = 'active'
    AND (_department_id IS NULL OR e.department_id = _department_id)
  ORDER BY e.first_name, e.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_presence(uuid) TO authenticated;

-- Function to update employee presence
CREATE OR REPLACE FUNCTION public.update_presence(
  _status text,
  _location text DEFAULT NULL
)
RETURNS public.employee_presence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_presence public.employee_presence;
  v_employee_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_employee_id := public.current_employee_id();

  INSERT INTO public.employee_presence(employee_id, status, location, last_updated)
  VALUES (v_employee_id, _status, _location, now())
  ON CONFLICT (employee_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    location = COALESCE(EXCLUDED.location, public.employee_presence.location),
    last_updated = now()
  RETURNING * INTO v_presence;

  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES (
    'presence_updated',
    'employee_presence',
    v_presence.id,
    auth.uid(),
    jsonb_build_object('status', _status, 'location', _location)
  );

  RETURN v_presence;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_presence(text, text) TO authenticated;

-- Function to get upcoming birthdays and anniversaries
CREATE OR REPLACE FUNCTION public.get_milestones_this_month()
RETURNS TABLE (
  employee_id uuid,
  first_name text,
  last_name text,
  event_type text,
  date_of_event date,
  days_until_event integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    e.id,
    e.first_name,
    e.last_name,
    'birthday' as event_type,
    make_date(EXTRACT(year FROM CURRENT_DATE)::integer, EXTRACT(month FROM e.birth_date)::integer, EXTRACT(day FROM e.birth_date)::integer)::date as date_of_event,
    (make_date(EXTRACT(year FROM CURRENT_DATE)::integer, EXTRACT(month FROM e.birth_date)::integer, EXTRACT(day FROM e.birth_date)::integer)::date - CURRENT_DATE) as days_until_event
  FROM public.employees e
  WHERE EXTRACT(month FROM e.birth_date) = EXTRACT(month FROM CURRENT_DATE)
    AND e.status = 'active'

  UNION ALL

  SELECT
    e.id,
    e.first_name,
    e.last_name,
    'work_anniversary' as event_type,
    make_date(EXTRACT(year FROM CURRENT_DATE)::integer, EXTRACT(month FROM e.hire_date)::integer, EXTRACT(day FROM e.hire_date)::integer)::date as date_of_event,
    (make_date(EXTRACT(year FROM CURRENT_DATE)::integer, EXTRACT(month FROM e.hire_date)::integer, EXTRACT(day FROM e.hire_date)::integer)::date - CURRENT_DATE) as days_until_event
  FROM public.employees e
  WHERE EXTRACT(month FROM e.hire_date) = EXTRACT(month FROM CURRENT_DATE)
    AND e.status = 'active'

  ORDER BY days_until_event ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_milestones_this_month() TO authenticated;
