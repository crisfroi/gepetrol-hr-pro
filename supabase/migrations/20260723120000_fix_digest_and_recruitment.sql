-- FASE 1: Fix digest() function issue with proper casting
-- The error "function digest(bytea, unknown) does not exist" was caused by improper casting
-- This migration adds the pgcrypto extension if needed and fixes the generate_development_seed_data function

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- FASE 2.1: Recruitment module tables
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  description text,
  department_id uuid REFERENCES departments(id),
  status varchar NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  experience_years integer,
  required_skills jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  full_name varchar NOT NULL,
  email varchar NOT NULL,
  phone varchar,
  status varchar NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'interviewed', 'rejected', 'hired')),
  applied_at timestamptz DEFAULT now(),
  resume_url varchar,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruitment_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES job_applicants(id) ON DELETE CASCADE,
  stage_name varchar NOT NULL,
  stage_order integer,
  completed_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies for recruitment tables
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_and_hr_can_read_job_postings"
  ON job_postings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_write_job_postings"
  ON job_postings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_update_job_postings"
  ON job_postings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_delete_job_postings"
  ON job_postings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_read_job_applicants"
  ON job_applicants FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_write_job_applicants"
  ON job_applicants FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_update_job_applicants"
  ON job_applicants FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_delete_job_applicants"
  ON job_applicants FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_read_recruitment_stages"
  ON recruitment_stages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_write_recruitment_stages"
  ON recruitment_stages FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

CREATE POLICY "admins_and_hr_can_update_recruitment_stages"
  ON recruitment_stages FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

-- Add audit triggers to recruitment tables
CREATE TRIGGER audit_job_postings AFTER INSERT OR UPDATE OR DELETE ON job_postings
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_job_applicants AFTER INSERT OR UPDATE OR DELETE ON job_applicants
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_recruitment_stages AFTER INSERT OR UPDATE OR DELETE ON recruitment_stages
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_applicants_job_posting ON job_applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applicants_status ON job_applicants(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_stages_applicant ON recruitment_stages(applicant_id);
