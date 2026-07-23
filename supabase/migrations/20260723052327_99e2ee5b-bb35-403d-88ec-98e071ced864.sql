
-- Fix infinite recursion in employees-derived policies by using a SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_employee_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_employee_department_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_department_id() TO authenticated;

-- employees: rebuild supervisor policy without self-reference
DROP POLICY IF EXISTS "employees: supervisor read" ON public.employees;
CREATE POLICY "employees: supervisor read" ON public.employees
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND (
    manager_id = public.current_employee_id()
    OR department_id = public.current_employee_department_id()
  )
);

-- employment_contracts: rebuild self read
DROP POLICY IF EXISTS "contracts: self read" ON public.employment_contracts;
CREATE POLICY "contracts: self read" ON public.employment_contracts
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id());

-- attendance_records
DROP POLICY IF EXISTS "attendance: self read/insert" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance: self insert" ON public.attendance_records;
CREATE POLICY "attendance: self read" ON public.attendance_records
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id());
CREATE POLICY "attendance: self insert" ON public.attendance_records
FOR INSERT TO authenticated
WITH CHECK (employee_id = public.current_employee_id());

-- leave_requests
DROP POLICY IF EXISTS "leave_req: self read" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_req: self insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_req: self update draft" ON public.leave_requests;
CREATE POLICY "leave_req: self read" ON public.leave_requests
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id());
CREATE POLICY "leave_req: self insert" ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY "leave_req: self update draft" ON public.leave_requests
FOR UPDATE TO authenticated
USING (
  employee_id = public.current_employee_id()
  AND status = ANY (ARRAY['draft'::leave_request_status, 'submitted'::leave_request_status])
)
WITH CHECK (employee_id = public.current_employee_id());

-- leave_balances
DROP POLICY IF EXISTS "leave_bal: self read" ON public.leave_balances;
CREATE POLICY "leave_bal: self read" ON public.leave_balances
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id());
