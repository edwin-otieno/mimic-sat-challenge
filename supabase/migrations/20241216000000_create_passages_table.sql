-- Create passages table for ACT passage-based questions
CREATE TABLE IF NOT EXISTS passages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    module_type TEXT NOT NULL CHECK (module_type IN ('reading', 'science', 'english')),
    title TEXT,
    content TEXT NOT NULL,
    passage_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_passages_test_id ON passages(test_id);
CREATE INDEX IF NOT EXISTS idx_passages_module_type ON passages(module_type);
CREATE INDEX IF NOT EXISTS idx_passages_test_module_order ON passages(test_id, module_type, passage_order);

-- Add RLS policies
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view passages for accessible tests" ON passages;
DROP POLICY IF EXISTS "Admins can manage passages" ON passages;

-- Allow users to view passages for tests they have access to
CREATE POLICY "Users can view passages for accessible tests"
    ON passages
    FOR SELECT
    USING (
        test_id IN (
            SELECT id FROM tests WHERE is_active = true
        )
    );

-- Allow admins to manage passages
CREATE POLICY "Admins can manage passages"
    ON passages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_passages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_passages_updated_at ON passages;
CREATE TRIGGER update_passages_updated_at
    BEFORE UPDATE ON passages
    FOR EACH ROW
    EXECUTE FUNCTION update_passages_updated_at();
