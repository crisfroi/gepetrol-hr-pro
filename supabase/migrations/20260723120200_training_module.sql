-- FASE 2.3: Training module - COMPLEMENTARY TABLES ONLY
-- Note: training_programs and training_enrollment already exist
-- This migration only adds complementary tables and improves existing ones

-- training_completion table for tracking completion
CREATE TABLE IF NOT EXISTS training_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_enrollment_id uuid NOT NULL REFERENCES training_enrollment(id) ON DELETE CASCADE,
  completion_date timestamptz NOT NULL DEFAULT now(),
  score numeric(5, 2) CHECK (score >= 0 AND score <= 100),
  certificate_url varchar,
  feedback text,
  verified_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies for training_completion
ALTER TABLE training_completion ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_see_own_completion" ON training_completion;
  DROP POLICY IF EXISTS "hr_admin_write_completion" ON training_completion;
  DROP POLICY IF EXISTS "hr_admin_update_completion" ON training_completion;
END $$;

CREATE POLICY "users_see_own_completion"
  ON training_completion FOR SELECT
  USING (
    auth.uid() IN (
      SELECT e.user_id FROM employees e WHERE e.id = (
        SELECT te.employee_id FROM training_enrollment te WHERE te.id = training_enrollment_id
      )
    ) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr'::public.app_role)
  );

CREATE POLICY "hr_admin_write_completion"
  ON training_completion FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "hr_admin_update_completion"
  ON training_completion FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

-- Add audit trigger (if it doesn't exist)
-- Note: DROP and CREATE if exists because CREATE TRIGGER IF NOT EXISTS is not in older PostgreSQL
DO $$
BEGIN
  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS audit_training_completion ON training_completion;

  -- Create trigger
  CREATE TRIGGER audit_training_completion
  AFTER INSERT OR UPDATE OR DELETE ON training_completion
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
END $$;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_training_completion_enrollment ON training_completion(training_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_training_completion_verified ON training_completion(verified_by);
