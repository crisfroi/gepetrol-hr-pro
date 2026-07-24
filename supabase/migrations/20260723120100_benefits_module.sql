-- FASE 2.2: Benefits module tables
CREATE TABLE IF NOT EXISTS benefit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  category varchar NOT NULL CHECK (category IN ('health', 'retirement', 'life_insurance', 'disability', 'other')),
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benefit_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_type_id uuid NOT NULL REFERENCES benefit_types(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  employee_cost numeric(12, 2) DEFAULT 0,
  employer_cost numeric(12, 2) DEFAULT 0,
  coverage_description text,
  coverage_amount numeric(12, 2),
  deductible numeric(12, 2),
  effective_from date,
  effective_to date,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  benefit_type_id uuid NOT NULL REFERENCES benefit_types(id),
  benefit_policy_id uuid NOT NULL REFERENCES benefit_policies(id),
  effective_from date NOT NULL,
  effective_to date,
  status varchar NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  coverage_level varchar,
  enrollment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies for benefits tables
ALTER TABLE benefit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;

-- Benefit types: readable by HR/admin, writable only by admin
CREATE POLICY "all_users_can_read_benefit_types"
  ON benefit_types FOR SELECT
  USING (true);

CREATE POLICY "admins_can_write_benefit_types"
  ON benefit_types FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins_can_update_benefit_types"
  ON benefit_types FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins_can_delete_benefit_types"
  ON benefit_types FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Benefit policies: readable by HR/admin, writable only by admin
CREATE POLICY "all_users_can_read_benefit_policies"
  ON benefit_policies FOR SELECT
  USING (true);

CREATE POLICY "admins_can_write_benefit_policies"
  ON benefit_policies FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins_can_update_benefit_policies"
  ON benefit_policies FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins_can_delete_benefit_policies"
  ON benefit_policies FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Employee benefits: HR and admin can manage, employees can see their own
CREATE POLICY "users_can_read_own_benefits"
  ON employee_benefits FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM employees WHERE id = employee_id) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr'::public.app_role)
  );

CREATE POLICY "admins_and_hr_can_write_employee_benefits"
  ON employee_benefits FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_update_employee_benefits"
  ON employee_benefits FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_delete_employee_benefits"
  ON employee_benefits FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

-- Add audit triggers
CREATE TRIGGER audit_benefit_types AFTER INSERT OR UPDATE OR DELETE ON benefit_types
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_benefit_policies AFTER INSERT OR UPDATE OR DELETE ON benefit_policies
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_employee_benefits AFTER INSERT OR UPDATE OR DELETE ON employee_benefits
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Create indices
CREATE INDEX IF NOT EXISTS idx_benefit_types_active ON benefit_types(active);
CREATE INDEX IF NOT EXISTS idx_benefit_policies_benefit_type ON benefit_policies(benefit_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_status ON employee_benefits(status);
