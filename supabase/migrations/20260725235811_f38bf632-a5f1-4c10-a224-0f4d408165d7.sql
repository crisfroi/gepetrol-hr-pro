
-- Create performance_criteria table used by the Evaluación de Desempeño UI
CREATE TABLE IF NOT EXISTS public.performance_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'technical',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_criteria TO authenticated;
GRANT ALL ON public.performance_criteria TO service_role;

ALTER TABLE public.performance_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read performance_criteria" ON public.performance_criteria;
CREATE POLICY "auth read performance_criteria" ON public.performance_criteria
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_hr manage performance_criteria" ON public.performance_criteria;
CREATE POLICY "admin_hr manage performance_criteria" ON public.performance_criteria
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr'::public.app_role));

DROP TRIGGER IF EXISTS trg_performance_criteria_updated_at ON public.performance_criteria;
CREATE TRIGGER trg_performance_criteria_updated_at
  BEFORE UPDATE ON public.performance_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns expected by the UI to performance_reviews (nullable, backwards compatible)
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS evaluator_id uuid,
  ADD COLUMN IF NOT EXISTS overall_rating numeric,
  ADD COLUMN IF NOT EXISTS comments text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;
