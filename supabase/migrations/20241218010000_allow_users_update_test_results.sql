-- Allow users to update their own test_results
-- This is needed for saving answers (especially essays) incrementally

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own test results" ON test_results;

-- Create policy to allow users to update their own test_results
CREATE POLICY "Users can update their own test results"
  ON test_results
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT UPDATE ON test_results TO authenticated;

