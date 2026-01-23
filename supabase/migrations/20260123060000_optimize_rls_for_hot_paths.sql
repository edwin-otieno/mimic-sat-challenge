-- Optimize RLS policies for high-frequency read paths
-- Created: 2026-01-23
--
-- Motivation:
-- `module_results` and `essay_grades` are read extremely frequently.
-- The original RLS policies used `IN (SELECT ...)`, which can be significantly more expensive
-- than an `EXISTS` join pattern under heavy load.
--
-- This migration:
-- 1) Adds a supporting index on `test_results(user_id, id)`
-- 2) Rewrites RLS policies for `module_results` and `essay_grades` to use `EXISTS`

-- Supporting index for RLS join checks
CREATE INDEX IF NOT EXISTS idx_test_results_user_id_id
  ON public.test_results (user_id, id);

-- -----------------------
-- module_results RLS
-- -----------------------

ALTER TABLE public.module_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own module results" ON public.module_results;
DROP POLICY IF EXISTS "Users can insert their own module results" ON public.module_results;
DROP POLICY IF EXISTS "Admins can view all module results" ON public.module_results;

-- Users can view their own module results (EXISTS join form)
CREATE POLICY "Users can view their own module results"
  ON public.module_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.test_results tr
      WHERE tr.id = public.module_results.test_result_id
        AND tr.user_id = auth.uid()
    )
  );

-- Users can insert their own module results (EXISTS join form)
CREATE POLICY "Users can insert their own module results"
  ON public.module_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.test_results tr
      WHERE tr.id = public.module_results.test_result_id
        AND tr.user_id = auth.uid()
    )
  );

-- Admins can view all module results (unchanged logic)
CREATE POLICY "Admins can view all module results"
  ON public.module_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- -----------------------
-- essay_grades RLS
-- -----------------------

ALTER TABLE public.essay_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers and admins can manage essay grades" ON public.essay_grades;
DROP POLICY IF EXISTS "Students can view their own essay grades" ON public.essay_grades;

-- Teachers and admins can select/insert/update/delete (unchanged logic)
CREATE POLICY "Teachers and admins can manage essay grades"
  ON public.essay_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','teacher')
    )
  );

-- Students can view grades linked to their own test_result (EXISTS join form)
CREATE POLICY "Students can view their own essay grades"
  ON public.essay_grades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.test_results tr
      WHERE tr.id = public.essay_grades.test_result_id
        AND tr.user_id = auth.uid()
    )
  );

