-- Add index for test_states cleanup performance
CREATE INDEX IF NOT EXISTS idx_test_states_updated_at ON test_states(updated_at);

-- Add comment to document the cleanup policy
COMMENT ON TABLE test_states IS 'Test states are automatically cleaned up after 7 days via scheduled function'; 