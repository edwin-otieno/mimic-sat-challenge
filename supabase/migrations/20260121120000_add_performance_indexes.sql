-- Performance optimization indexes to reduce CPU usage
-- Created: 2026-01-21
-- Purpose: Fix N+1 query problems and optimize frequently queried columns

-- Index for module_results queries by test_result_id
-- This index dramatically improves performance for fetching module results
-- Used heavily in Results page and Dashboard
CREATE INDEX IF NOT EXISTS idx_module_results_test_result_id 
ON module_results(test_result_id);

-- Index for essay_grades queries by test_result_id
-- Used in Results page and Dashboard to fetch essay scores
CREATE INDEX IF NOT EXISTS idx_essay_grades_test_result_id 
ON essay_grades(test_result_id);

-- Composite index for test_results queries by user_id, test_id, and created_at
-- Optimizes queries that filter by user and test, then sort by date
CREATE INDEX IF NOT EXISTS idx_test_results_user_test_created 
ON test_results(user_id, test_id, created_at DESC);

-- Index for test_states queries by user_id and test_permalink
-- Combined with updated_at for sorting most recent states
CREATE INDEX IF NOT EXISTS idx_test_states_user_permalink_updated 
ON test_states(user_id, test_permalink, updated_at DESC);

-- Index for test_results completion status queries
-- Helps filter completed tests efficiently
CREATE INDEX IF NOT EXISTS idx_test_results_user_completed 
ON test_results(user_id, is_completed, created_at DESC)
WHERE is_completed = true;

-- Add comments documenting the purpose of these indexes
COMMENT ON INDEX idx_module_results_test_result_id IS 
  'Optimizes module_results queries by test_result_id - fixes N+1 query problem in Results and Dashboard';

COMMENT ON INDEX idx_essay_grades_test_result_id IS 
  'Optimizes essay_grades queries by test_result_id - reduces CPU load when fetching essay scores';

COMMENT ON INDEX idx_test_results_user_test_created IS 
  'Composite index for efficient user + test filtering with date sorting';

COMMENT ON INDEX idx_test_states_user_permalink_updated IS 
  'Composite index for test state lookups and cleanup operations';

COMMENT ON INDEX idx_test_results_user_completed IS 
  'Partial index for efficiently querying completed tests only';
