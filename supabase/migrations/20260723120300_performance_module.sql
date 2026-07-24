-- FASE 2.4: Performance evaluation module - COMPLEMENTARY TABLES ONLY
-- Note: performance_reviews table already exists with structure:
-- (id, employee_id, reviewer_id, cycle_id, overall_score, status, notes, created_at, updated_at)
-- This migration only adds complementary tables and policies

-- Add performance_cycles table if it doesn't exist
-- If it exists, add missing columns
CREATE TABLE IF NOT EXISTS performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  cycle_type varchar NOT NULL DEFAULT 'annual' CHECK (cycle_type IN ('annual', 'quarterly', 'mid-year')),
  start_date date,
  end_date date,
  status varchar DEFAULT 'open' CHECK (status IN ('open', 'closed', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add year column if it doesn't exist
ALTER TABLE performance_cycles ADD COLUMN IF NOT EXISTS year integer;

-- Performance criteria table for evaluation metrics
CREATE TABLE IF NOT EXISTS performance_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  description text,
  weight numeric(5, 2) CHECK (weight >= 0 AND weight <= 100),
  category varchar CHECK (category IN ('technical', 'behavioral', 'productivity', 'compliance')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Review feedback (detailed scores per criterion)
CREATE TABLE IF NOT EXISTS review_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES performance_criteria(id),
  rating numeric(3, 1) CHECK (rating >= 1 AND rating <= 5),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 360-degree feedback
CREATE TABLE IF NOT EXISTS performance_review_360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  feedback_from_id uuid NOT NULL REFERENCES employees(id),
  feedback_type varchar CHECK (feedback_type IN ('peer', 'manager', 'direct_report', 'customer')),
  overall_rating numeric(3, 1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  comments text,
  anonymous boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_review_360 ENABLE ROW LEVEL SECURITY;

-- Cycles: HR and admin can manage (safely drop first)
DO $$
BEGIN
  DROP POLICY IF EXISTS "hr_admin_read_cycles" ON performance_cycles;
  DROP POLICY IF EXISTS "hr_admin_write_cycles" ON performance_cycles;
  DROP POLICY IF EXISTS "hr_admin_update_cycles" ON performance_cycles;
END $$;

CREATE POLICY "hr_admin_read_cycles"
  ON performance_cycles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "hr_admin_write_cycles"
  ON performance_cycles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "hr_admin_update_cycles"
  ON performance_cycles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

-- Criteria: read by all, write by admin (safely drop first)
DO $$
BEGIN
  DROP POLICY IF EXISTS "all_read_criteria" ON performance_criteria;
  DROP POLICY IF EXISTS "admin_write_criteria" ON performance_criteria;
  DROP POLICY IF EXISTS "admin_update_criteria" ON performance_criteria;
END $$;

CREATE POLICY "all_read_criteria"
  ON performance_criteria FOR SELECT
  USING (true);

CREATE POLICY "admin_write_criteria"
  ON performance_criteria FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin_update_criteria"
  ON performance_criteria FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Feedback: users see own, HR/admin see all (safely drop first)
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_see_own_feedback" ON review_feedback;
  DROP POLICY IF EXISTS "reviewers_write_feedback" ON review_feedback;
END $$;

CREATE POLICY "users_see_own_feedback"
  ON review_feedback FOR SELECT
  USING (
    auth.uid() IN (
      SELECT reviewer_id FROM performance_reviews WHERE id = review_id
      UNION
      SELECT e.user_id FROM employees e WHERE e.id = (SELECT employee_id FROM performance_reviews WHERE id = review_id)
    ) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr'::public.app_role)
  );

CREATE POLICY "reviewers_write_feedback"
  ON review_feedback FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT reviewer_id FROM performance_reviews WHERE id = review_id) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 360 feedback: users see own, HR/admin see all (safely drop first)
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_see_own_360" ON performance_review_360;
  DROP POLICY IF EXISTS "employees_submit_360" ON performance_review_360;
END $$;

CREATE POLICY "users_see_own_360"
  ON performance_review_360 FOR SELECT
  USING (
    auth.uid() = feedback_from_id OR
    auth.uid() IN (
      SELECT e.user_id FROM employees e WHERE e.id = (SELECT employee_id FROM performance_reviews WHERE id = review_id)
    ) OR
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'hr'::public.app_role)
  );

CREATE POLICY "employees_submit_360"
  ON performance_review_360 FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM employees WHERE id = feedback_from_id));

-- Add audit triggers (safely, with drop if exists)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS audit_performance_cycles ON performance_cycles;
  CREATE TRIGGER audit_performance_cycles AFTER INSERT OR UPDATE OR DELETE ON performance_cycles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

  DROP TRIGGER IF EXISTS audit_performance_criteria ON performance_criteria;
  CREATE TRIGGER audit_performance_criteria AFTER INSERT OR UPDATE OR DELETE ON performance_criteria
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

  DROP TRIGGER IF EXISTS audit_review_feedback ON review_feedback;
  CREATE TRIGGER audit_review_feedback AFTER INSERT OR UPDATE OR DELETE ON review_feedback
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

  DROP TRIGGER IF EXISTS audit_performance_review_360 ON performance_review_360;
  CREATE TRIGGER audit_performance_review_360 AFTER INSERT OR UPDATE OR DELETE ON performance_review_360
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
END $$;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_performance_cycles_year ON performance_cycles(year);
CREATE INDEX IF NOT EXISTS idx_performance_cycles_status ON performance_cycles(status);
CREATE INDEX IF NOT EXISTS idx_performance_criteria_cycle ON performance_criteria(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_review ON review_feedback(review_id);
CREATE INDEX IF NOT EXISTS idx_review_feedback_criterion ON review_feedback(criterion_id);
CREATE INDEX IF NOT EXISTS idx_performance_360_review ON performance_review_360(review_id);
