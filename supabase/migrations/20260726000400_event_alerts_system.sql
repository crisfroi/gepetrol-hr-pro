-- Create event_alerts table (replaces/extends payment_alerts)
CREATE TABLE IF NOT EXISTS public.event_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'payment_anomaly', 'salary_change', 'new_employee', 'employee_termination',
    'absence_exceeds_threshold', 'leave_expiry_warning', 'contract_expiry_warning',
    'missing_data', 'approval_required', 'permission_expiry_warning',
    'benefits_expiry_warning', 'schedule_conflict', 'payroll_error'
  )),
  triggered_by_entity_type text NOT NULL CHECK (triggered_by_entity_type IN (
    'payslip', 'payroll_run', 'employee', 'contract', 'attendance', 
    'leave_request', 'leave_balance', 'benefit', 'schedule', 'payroll_change_log'
  )),
  triggered_by_entity_id uuid NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'resolved')),
  title text NOT NULL,
  description text,
  data jsonb DEFAULT '{}'::jsonb,
  assigned_to_role text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_alerts_alert_type ON public.event_alerts(alert_type);
CREATE INDEX idx_event_alerts_triggered_by_entity_id ON public.event_alerts(triggered_by_entity_id);
CREATE INDEX idx_event_alerts_status ON public.event_alerts(status);
CREATE INDEX idx_event_alerts_severity ON public.event_alerts(severity);
CREATE INDEX idx_event_alerts_assigned_to_role ON public.event_alerts(assigned_to_role);
CREATE INDEX idx_event_alerts_created_at ON public.event_alerts(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.event_alerts TO authenticated;
GRANT ALL ON public.event_alerts TO service_role;

ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read event_alerts" ON public.event_alerts;
CREATE POLICY "auth read event_alerts" ON public.event_alerts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth update event_alerts" ON public.event_alerts;
CREATE POLICY "auth update event_alerts" ON public.event_alerts
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'finance'::public.app_role)
  );

-- Create alert_rules table for configurable alert triggering
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN ('entity_change', 'threshold', 'time_based', 'schedule')),
  alert_type text NOT NULL CHECK (alert_type IN (
    'payment_anomaly', 'salary_change', 'new_employee', 'employee_termination',
    'absence_exceeds_threshold', 'leave_expiry_warning', 'contract_expiry_warning',
    'missing_data', 'approval_required', 'permission_expiry_warning',
    'benefits_expiry_warning', 'schedule_conflict', 'payroll_error'
  )),
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  assigned_to_role text,
  enabled boolean NOT NULL DEFAULT true,
  trigger_on_field text,
  threshold_value numeric,
  threshold_comparison text CHECK (threshold_comparison IN ('equals', 'gt', 'gte', 'lt', 'lte', 'between', 'contains')),
  days_before_event integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_rules_alert_type ON public.alert_rules(alert_type);
CREATE INDEX idx_alert_rules_enabled ON public.alert_rules(enabled);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_rules TO authenticated;
GRANT ALL ON public.alert_rules TO service_role;

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read alert_rules" ON public.alert_rules;
CREATE POLICY "auth read alert_rules" ON public.alert_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manage alert_rules" ON public.alert_rules;
CREATE POLICY "admin manage alert_rules" ON public.alert_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_event_alerts_updated_at ON public.event_alerts;
CREATE TRIGGER trg_event_alerts_updated_at
  BEFORE UPDATE ON public.event_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_alert_rules_updated_at ON public.alert_rules;
CREATE TRIGGER trg_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default alert rules
INSERT INTO public.alert_rules (name, description, rule_type, alert_type, severity, assigned_to_role, condition)
VALUES
  (
    'Salary change over 10%',
    'Alert when base salary changes by more than 10%',
    'threshold',
    'salary_change',
    'critical',
    'finance',
    jsonb_build_object('change_percentage_threshold', 10)
  ),
  (
    'New employee added',
    'Alert when new employee is added to system',
    'entity_change',
    'new_employee',
    'info',
    'hr',
    jsonb_build_object('event', 'employee_created')
  ),
  (
    'Absence exceeds 5 days',
    'Alert when employee absence exceeds 5 consecutive days',
    'threshold',
    'absence_exceeds_threshold',
    'warning',
    'hr',
    jsonb_build_object('days_threshold', 5)
  ),
  (
    'Leave expiry in 14 days',
    'Alert when employee leave balance expires in less than 14 days',
    'time_based',
    'leave_expiry_warning',
    'warning',
    'hr',
    jsonb_build_object('days_notice', 14)
  ),
  (
    'Contract expiry in 30 days',
    'Alert when employment contract is about to expire in 30 days',
    'time_based',
    'contract_expiry_warning',
    'warning',
    'hr',
    jsonb_build_object('days_notice', 30)
  )
ON CONFLICT DO NOTHING;

-- Function to trigger alerts for payroll changes
CREATE OR REPLACE FUNCTION public.trigger_alerts_for_payroll_change(
  _change_log_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change_log public.payroll_change_log%ROWTYPE;
  v_salary_change_percent numeric;
  v_alert_created boolean := false;
BEGIN
  SELECT * INTO v_change_log FROM public.payroll_change_log WHERE id = _change_log_id;
  
  IF v_change_log IS NULL THEN
    RAISE EXCEPTION 'Change log not found: %', _change_log_id;
  END IF;

  -- Check for salary changes
  IF v_change_log.event_type = 'salary_changed' THEN
    IF v_change_log.old_value->>'base_salary' IS NOT NULL THEN
      v_salary_change_percent := abs(
        (CAST(v_change_log.new_value->>'base_salary' AS numeric) - 
         CAST(v_change_log.old_value->>'base_salary' AS numeric)) /
        CAST(v_change_log.old_value->>'base_salary' AS numeric) * 100
      );

      IF v_salary_change_percent > 10 THEN
        INSERT INTO public.event_alerts(
          alert_type,
          triggered_by_entity_type,
          triggered_by_entity_id,
          severity,
          title,
          description,
          data,
          assigned_to_role
        )
        VALUES (
          'salary_change',
          'payroll_change_log',
          v_change_log.id,
          'critical',
          'Salary change exceeds 10%',
          format('Employee salary changed by %.1f%% (from %s to %s)',
            v_salary_change_percent,
            v_change_log.old_value->>'base_salary',
            v_change_log.new_value->>'base_salary'
          ),
          jsonb_build_object(
            'old_salary', v_change_log.old_value->>'base_salary',
            'new_salary', v_change_log.new_value->>'base_salary',
            'change_percent', round(v_salary_change_percent, 2),
            'contract_id', v_change_log.entity_id
          ),
          'finance'
        );
        v_alert_created := true;
      END IF;
    END IF;
  END IF;

  -- Check for new employees
  IF v_change_log.event_type = 'employee_added' THEN
    INSERT INTO public.event_alerts(
      alert_type,
      triggered_by_entity_type,
      triggered_by_entity_id,
      severity,
      title,
      description,
      data,
      assigned_to_role
    )
    VALUES (
      'new_employee',
      'payroll_change_log',
      v_change_log.id,
      'info',
      'New employee added',
      format('Employee %s %s has been added to the system',
        v_change_log.new_value->>'first_name',
        v_change_log.new_value->>'last_name'
      ),
      v_change_log.new_value,
      'hr'
    );
    v_alert_created := true;
  END IF;

  RETURN jsonb_build_object(
    'change_log_id', _change_log_id,
    'alert_created', v_alert_created
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_alerts_for_payroll_change(uuid) TO authenticated;

-- Function to trigger alerts for attendance
CREATE OR REPLACE FUNCTION public.trigger_alerts_for_absence(
  _employee_id uuid,
  _absence_days integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _absence_days > 5 THEN
    INSERT INTO public.event_alerts(
      alert_type,
      triggered_by_entity_type,
      triggered_by_entity_id,
      severity,
      title,
      description,
      data,
      assigned_to_role
    )
    VALUES (
      'absence_exceeds_threshold',
      'employee',
      _employee_id,
      'warning',
      'Employee absence exceeds threshold',
      format('Employee has been absent for %s consecutive days', _absence_days),
      jsonb_build_object('absence_days', _absence_days),
      'hr'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_alerts_for_absence(uuid, integer) TO authenticated;

-- Deprecate old payment_alerts if it exists (keep for backward compatibility)
ALTER TABLE public.payment_alerts ADD COLUMN IF NOT EXISTS event_alert_id uuid REFERENCES public.event_alerts(id);
