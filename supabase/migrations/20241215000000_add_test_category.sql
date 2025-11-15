-- Add test_category column to tests table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_category TEXT DEFAULT 'SAT' CHECK (test_category IN ('SAT', 'ACT'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tests_test_category ON tests(test_category);

-- Update existing tests to have SAT category (if they don't have one)
UPDATE tests SET test_category = 'SAT' WHERE test_category IS NULL;
