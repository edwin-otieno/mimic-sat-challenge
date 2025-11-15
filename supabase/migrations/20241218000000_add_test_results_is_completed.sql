-- Add is_completed field to test_results table to track in-progress tests
ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_results_is_completed ON test_results(is_completed);

-- Update ALL existing test_results to be marked as completed (backward compatibility)
-- Since the default is false, all existing rows will be false, so we update all of them to true
UPDATE test_results SET is_completed = true WHERE is_completed = false OR is_completed IS NULL;

-- Update RLS policies to allow teachers to view test results
DROP POLICY IF EXISTS "Teachers can view all test results" ON test_results;

CREATE POLICY "Teachers can view all test results"
  ON test_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

-- Update module_results RLS to allow teachers to view module results
DROP POLICY IF EXISTS "Teachers can view all module results" ON module_results;
DROP POLICY IF EXISTS "Users can update their own module results" ON module_results;

CREATE POLICY "Teachers can view all module results"
  ON module_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

-- Allow users to update their own module results (for incremental saves)
CREATE POLICY "Users can update their own module results"
  ON module_results
  FOR UPDATE
  USING (
    test_result_id IN (
      SELECT id FROM test_results WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    test_result_id IN (
      SELECT id FROM test_results WHERE user_id = auth.uid()
    )
  );

