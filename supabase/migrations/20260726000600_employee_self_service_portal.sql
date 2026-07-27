-- Create payslip_downloads tracking table
CREATE TABLE IF NOT EXISTS public.payslip_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id uuid NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX idx_payslip_downloads_employee_id ON public.payslip_downloads(employee_id);
CREATE INDEX idx_payslip_downloads_downloaded_at ON public.payslip_downloads(downloaded_at DESC);

GRANT SELECT, INSERT ON public.payslip_downloads TO authenticated;
GRANT ALL ON public.payslip_downloads TO service_role;

ALTER TABLE public.payslip_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees view own downloads" ON public.payslip_downloads;
CREATE POLICY "employees view own downloads" ON public.payslip_downloads
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

DROP POLICY IF EXISTS "employees record own downloads" ON public.payslip_downloads;
CREATE POLICY "employees record own downloads" ON public.payslip_downloads
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());

-- Create leave_request_comments for communication
CREATE TABLE IF NOT EXISTS public.leave_request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leave_request_comments_leave_request_id ON public.leave_request_comments(leave_request_id);
CREATE INDEX idx_leave_request_comments_author_id ON public.leave_request_comments(author_id);

GRANT SELECT, INSERT, UPDATE ON public.leave_request_comments TO authenticated;
GRANT ALL ON public.leave_request_comments TO service_role;

ALTER TABLE public.leave_request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read leave_request_comments" ON public.leave_request_comments;
CREATE POLICY "auth read leave_request_comments" ON public.leave_request_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users insert own comments" ON public.leave_request_comments;
CREATE POLICY "users insert own comments" ON public.leave_request_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "users update own comments" ON public.leave_request_comments;
CREATE POLICY "users update own comments" ON public.leave_request_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP TRIGGER IF EXISTS trg_leave_request_comments_updated_at ON public.leave_request_comments;
CREATE TRIGGER trg_leave_request_comments_updated_at
  BEFORE UPDATE ON public.leave_request_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add fields to employees table for self-service updates
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS bank_account_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS tax_id_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS personal_data_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS personal_data_verified_at timestamptz;

-- Function for employees to view their payslips with context
CREATE OR REPLACE FUNCTION public.get_employee_payslips(
  _limit integer DEFAULT 12,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  payslip_id uuid,
  run_id uuid,
  gross numeric,
  deductions numeric,
  net numeric,
  currency text,
  period_start date,
  period_end date,
  pay_date date,
  pdf_url text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id,
    p.run_id,
    p.gross,
    p.deductions,
    p.net,
    p.currency,
    pr.period_start,
    pr.period_end,
    pr.pay_date,
    p.pdf_url,
    p.created_at
  FROM public.payslips p
  JOIN public.payroll_runs pr ON p.run_id = pr.id
  WHERE p.employee_id = public.current_employee_id()
  ORDER BY pr.pay_date DESC
  LIMIT _limit
  OFFSET _offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_payslips(integer, integer) TO authenticated;

-- Function for employees to view their leave balance
CREATE OR REPLACE FUNCTION public.get_employee_leave_balance()
RETURNS TABLE (
  leave_type text,
  balance numeric,
  used numeric,
  pending numeric,
  expires_at date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(lb.leave_type, 'annual') as leave_type,
    COALESCE(lb.balance, 0) as balance,
    COALESCE(
      (SELECT COALESCE(SUM(EXTRACT(day FROM (end_date - start_date))), 0)
       FROM public.leave_requests
       WHERE employee_id = public.current_employee_id()
         AND status = 'approved'
         AND EXTRACT(year FROM start_date) = EXTRACT(year FROM CURRENT_DATE)),
      0
    ) as used,
    COALESCE(
      (SELECT COALESCE(SUM(EXTRACT(day FROM (end_date - start_date))), 0)
       FROM public.leave_requests
       WHERE employee_id = public.current_employee_id()
         AND status = 'pending'),
      0
    ) as pending,
    lb.expires_at
  FROM public.leave_balances lb
  WHERE lb.employee_id = public.current_employee_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_leave_balance() TO authenticated;

-- Function to record payslip download for audit
CREATE OR REPLACE FUNCTION public.record_payslip_download(
  _payslip_id uuid,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payslip public.payslips;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_payslip FROM public.payslips WHERE id = _payslip_id;
  IF v_payslip IS NULL THEN
    RAISE EXCEPTION 'Payslip not found';
  END IF;

  IF v_payslip.employee_id != public.current_employee_id() AND
     NOT public.has_role(auth.uid(), 'admin'::public.app_role) AND
     NOT public.has_role(auth.uid(), 'finance'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.payslip_downloads(payslip_id, employee_id, ip_address, user_agent)
  VALUES (_payslip_id, v_payslip.employee_id, _ip_address, _user_agent);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payslip_download(uuid, text, text) TO authenticated;

-- Function to update employee personal data
CREATE OR REPLACE FUNCTION public.update_employee_personal_data(
  _address text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _bank_account text DEFAULT NULL,
  _emergency_contact text DEFAULT NULL
)
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee public.employees;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_employee FROM public.employees WHERE id = public.current_employee_id();
  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  UPDATE public.employees
  SET
    address = COALESCE(_address, address),
    phone = COALESCE(_phone, phone),
    bank_account = COALESCE(_bank_account, bank_account),
    emergency_contact = COALESCE(_emergency_contact, emergency_contact),
    bank_account_updated_at = CASE WHEN _bank_account IS NOT NULL THEN now() ELSE bank_account_updated_at END,
    updated_at = now()
  WHERE id = public.current_employee_id()
  RETURNING * INTO v_employee;

  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES (
    'employee_self_service_update',
    'employees',
    v_employee.id,
    auth.uid(),
    jsonb_build_object(
      'address', _address IS NOT NULL,
      'phone', _phone IS NOT NULL,
      'bank_account', _bank_account IS NOT NULL,
      'emergency_contact', _emergency_contact IS NOT NULL
    )
  );

  RETURN v_employee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_employee_personal_data(text, text, text, text) TO authenticated;

-- Ensure employees can only see their own data via RLS
DROP POLICY IF EXISTS "employees see own record" ON public.employees;
CREATE POLICY "employees see own record" ON public.employees
  FOR SELECT TO authenticated
  USING (id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "employees view own payslips" ON public.payslips;
CREATE POLICY "employees view own payslips" ON public.payslips
  FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'finance'::public.app_role)
  );

-- Allow employees to see their own leave requests
DROP POLICY IF EXISTS "employees view own leave requests" ON public.leave_requests;
CREATE POLICY "employees view own leave requests" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

-- Allow employees to see their own leave balances
DROP POLICY IF EXISTS "employees view own leave balance" ON public.leave_balances;
CREATE POLICY "employees view own leave balance" ON public.leave_balances
  FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

-- Function to request leave from employee portal
CREATE OR REPLACE FUNCTION public.request_leave_from_portal(
  _leave_type text,
  _start_date date,
  _end_date date,
  _reason text DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.leave_requests;
  v_balance public.leave_balances;
  v_days_requested numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate dates
  IF _end_date < _start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  IF _start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot request leave in the past';
  END IF;

  -- Calculate days requested
  v_days_requested := EXTRACT(day FROM (_end_date - _start_date)) + 1;

  -- Check balance
  SELECT * INTO v_balance
  FROM public.leave_balances
  WHERE employee_id = public.current_employee_id()
    AND COALESCE(leave_type, 'annual') = COALESCE(_leave_type, 'annual');

  IF v_balance IS NULL OR v_balance.balance < v_days_requested THEN
    RAISE EXCEPTION 'Insufficient leave balance. Available: %s, Requested: %s',
      COALESCE(v_balance.balance, 0), v_days_requested;
  END IF;

  -- Create request
  INSERT INTO public.leave_requests(
    employee_id,
    leave_type,
    start_date,
    end_date,
    reason,
    status,
    created_by
  )
  VALUES (
    public.current_employee_id(),
    _leave_type,
    _start_date,
    _end_date,
    _reason,
    'pending',
    auth.uid()
  )
  RETURNING * INTO v_request;

  -- Create alert for HR
  INSERT INTO public.event_alerts(
    alert_type,
    triggered_by_entity_type,
    triggered_by_entity_id,
    severity,
    title,
    description,
    assigned_to_role,
    status
  )
  VALUES (
    'approval_required',
    'leave_requests',
    v_request.id,
    'info',
    'New leave request pending approval',
    format('Employee %s has requested %s days of %s leave from %s to %s',
      public.current_employee_id()::text,
      v_days_requested::integer,
      _leave_type,
      _start_date,
      _end_date
    ),
    'hr',
    'pending'
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_leave_from_portal(text, date, date, text) TO authenticated;
