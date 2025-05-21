-- Create module_results table
CREATE TABLE IF NOT EXISTS module_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    scaled_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_module_results_test_result_id ON module_results(test_result_id);
CREATE INDEX IF NOT EXISTS idx_module_results_module_id ON module_results(module_id);

-- Add RLS policies
ALTER TABLE module_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own module results" ON module_results;
DROP POLICY IF EXISTS "Users can insert their own module results" ON module_results;
DROP POLICY IF EXISTS "Admins can view all module results" ON module_results;

-- Allow users to view their own module results
CREATE POLICY "Users can view their own module results"
    ON module_results
    FOR SELECT
    USING (
        test_result_id IN (
            SELECT id FROM test_results WHERE user_id = auth.uid()
        )
    );

-- Allow users to insert their own module results
CREATE POLICY "Users can insert their own module results"
    ON module_results
    FOR INSERT
    WITH CHECK (
        test_result_id IN (
            SELECT id FROM test_results WHERE user_id = auth.uid()
        )
    );

-- Allow admins to view all module results
CREATE POLICY "Admins can view all module results"
    ON module_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    ); 