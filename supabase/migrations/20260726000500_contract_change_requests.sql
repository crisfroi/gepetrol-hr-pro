-- Create contract_change_requests table for approval workflow
CREATE TABLE IF NOT EXISTS public.contract_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN (
    'salary_adjustment', 'benefits_modification', 'schedule_change',
    'position_change', 'contract_extension', 'termination'
  )),
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  requested_by uuid REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'pending', 'approved', 'applied', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  approval_notes text,
  applied_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_change_requests_contract_id ON public.contract_change_requests(contract_id);
CREATE INDEX idx_contract_change_requests_employee_id ON public.contract_change_requests(employee_id);
CREATE INDEX idx_contract_change_requests_state ON public.contract_change_requests(state);
CREATE INDEX idx_contract_change_requests_requested_at ON public.contract_change_requests(requested_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.contract_change_requests TO authenticated;
GRANT ALL ON public.contract_change_requests TO service_role;

ALTER TABLE public.contract_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read contract_change_requests" ON public.contract_change_requests;
CREATE POLICY "auth read contract_change_requests" ON public.contract_change_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hr_admin create contract_change_requests" ON public.contract_change_requests;
CREATE POLICY "hr_admin create contract_change_requests" ON public.contract_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

DROP POLICY IF EXISTS "hr_admin update contract_change_requests" ON public.contract_change_requests;
CREATE POLICY "hr_admin update contract_change_requests" ON public.contract_change_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

DROP TRIGGER IF EXISTS trg_contract_change_requests_updated_at ON public.contract_change_requests;
CREATE TRIGGER trg_contract_change_requests_updated_at
  BEFORE UPDATE ON public.contract_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to request contract change
CREATE OR REPLACE FUNCTION public.request_contract_change(
  _contract_id uuid,
  _change_type text,
  _old_values jsonb DEFAULT '{}'::jsonb,
  _new_values jsonb DEFAULT '{}'::jsonb,
  _reason text DEFAULT NULL
)
RETURNS public.contract_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.contract_change_requests;
  v_contract public.employment_contracts;
  v_employee_id uuid;
  v_severity text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to request contract changes';
  END IF;

  SELECT * INTO v_contract FROM public.employment_contracts WHERE id = _contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  v_employee_id := v_contract.employee_id;

  INSERT INTO public.contract_change_requests(
    contract_id,
    employee_id,
    change_type,
    old_values,
    new_values,
    reason,
    requested_by,
    state
  )
  VALUES (
    _contract_id,
    v_employee_id,
    _change_type,
    _old_values,
    _new_values,
    _reason,
    auth.uid(),
    'pending'
  )
  RETURNING * INTO v_request;

  -- Determine severity for alert based on change type
  v_severity := CASE
    WHEN _change_type = 'salary_adjustment' THEN 'critical'
    WHEN _change_type = 'termination' THEN 'critical'
    WHEN _change_type = 'position_change' THEN 'warning'
    ELSE 'info'
  END;

  -- Create alert for this change request
  INSERT INTO public.event_alerts(
    alert_type,
    triggered_by_entity_type,
    triggered_by_entity_id,
    severity,
    title,
    description,
    data,
    assigned_to_role,
    status
  )
  VALUES (
    'approval_required',
    'contract_change_requests',
    v_request.id,
    v_severity,
    format('Contract change request: %s for employee %s', _change_type, v_employee_id::text),
    format('A contract change request of type "%s" has been created and requires approval.', _change_type),
    jsonb_build_object(
      'request_id', v_request.id,
      'contract_id', _contract_id,
      'change_type', _change_type,
      'old_values', _old_values,
      'new_values', _new_values,
      'reason', _reason
    ),
    'finance'
  );

  -- Log the change request
  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES (
    'contract_change_requested',
    'contract_change_requests',
    v_request.id,
    auth.uid(),
    to_jsonb(v_request)
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_contract_change(uuid, text, jsonb, jsonb, text) TO authenticated;

-- Function to approve contract change
CREATE OR REPLACE FUNCTION public.approve_contract_change(
  _request_id uuid,
  _approval_notes text DEFAULT NULL
)
RETURNS public.contract_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.contract_change_requests;
  v_contract public.employment_contracts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'finance'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to approve contract changes';
  END IF;

  SELECT * INTO v_request FROM public.contract_change_requests WHERE id = _request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Change request not found';
  END IF;

  IF v_request.state NOT IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'Can only approve pending or previously rejected requests';
  END IF;

  -- Update the request status
  UPDATE public.contract_change_requests
  SET state = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      approval_notes = _approval_notes,
      updated_at = now()
  WHERE id = _request_id
  RETURNING * INTO v_request;

  -- Apply the contract changes
  SELECT * INTO v_contract FROM public.employment_contracts WHERE id = v_request.contract_id;

  IF v_request.change_type = 'salary_adjustment' THEN
    UPDATE public.employment_contracts
    SET base_salary = CAST(v_request.new_values->>'base_salary' AS numeric),
        updated_at = now()
    WHERE id = v_request.contract_id;
  ELSIF v_request.change_type = 'benefits_modification' THEN
    UPDATE public.employment_contracts
    SET benefits = v_request.new_values->'benefits',
        updated_at = now()
    WHERE id = v_request.contract_id;
  ELSIF v_request.change_type = 'schedule_change' THEN
    UPDATE public.employment_contracts
    SET schedule_type = v_request.new_values->>'schedule_type',
        updated_at = now()
    WHERE id = v_request.contract_id;
  END IF;

  -- Mark as applied
  UPDATE public.contract_change_requests
  SET state = 'applied',
      applied_at = now(),
      updated_at = now()
  WHERE id = _request_id;

  -- Log the approval
  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES (
    'contract_change_approved_applied',
    'contract_change_requests',
    _request_id,
    auth.uid(),
    jsonb_build_object('approval_notes', _approval_notes)
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_contract_change(uuid, text) TO authenticated;

-- Function to reject contract change
CREATE OR REPLACE FUNCTION public.reject_contract_change(
  _request_id uuid,
  _reason text
)
RETURNS public.contract_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.contract_change_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'finance'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges to reject contract changes';
  END IF;

  UPDATE public.contract_change_requests
  SET state = 'rejected',
      rejection_reason = _reason,
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  WHERE id = _request_id
  RETURNING * INTO v_request;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Change request not found';
  END IF;

  -- Create alert for rejection
  INSERT INTO public.event_alerts(
    alert_type,
    triggered_by_entity_type,
    triggered_by_entity_id,
    severity,
    title,
    description,
    data,
    assigned_to_role,
    status
  )
  VALUES (
    'approval_required',
    'contract_change_requests',
    _request_id,
    'warning',
    'Contract change request rejected',
    'A contract change request has been rejected: ' || _reason,
    jsonb_build_object(
      'request_id', _request_id,
      'rejection_reason', _reason
    ),
    'hr'
  );

  INSERT INTO public.audit_log(action, entity, entity_id, actor_user_id, after_data)
  VALUES (
    'contract_change_rejected',
    'contract_change_requests',
    _request_id,
    auth.uid(),
    jsonb_build_object('rejection_reason', _reason)
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_contract_change(uuid, text) TO authenticated;
