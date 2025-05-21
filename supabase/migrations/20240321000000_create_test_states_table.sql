-- Create test_states table
CREATE TABLE IF NOT EXISTS test_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_permalink TEXT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_test_states_user_id ON test_states(user_id);
CREATE INDEX IF NOT EXISTS idx_test_states_test_permalink ON test_states(test_permalink);

-- Add RLS policies
ALTER TABLE test_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own test states" ON test_states;
DROP POLICY IF EXISTS "Users can insert their own test states" ON test_states;
DROP POLICY IF EXISTS "Users can update their own test states" ON test_states;
DROP POLICY IF EXISTS "Users can delete their own test states" ON test_states;

-- Allow users to view their own test states
CREATE POLICY "Users can view their own test states"
    ON test_states
    FOR SELECT
    USING (user_id = auth.uid());

-- Allow users to insert their own test states
CREATE POLICY "Users can insert their own test states"
    ON test_states
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own test states
CREATE POLICY "Users can update their own test states"
    ON test_states
    FOR UPDATE
    USING (user_id = auth.uid());

-- Allow users to delete their own test states
CREATE POLICY "Users can delete their own test states"
    ON test_states
    FOR DELETE
    USING (user_id = auth.uid()); 