-- Update test_questions table to support passage-based questions
ALTER TABLE test_questions 
ADD COLUMN IF NOT EXISTS passage_id UUID REFERENCES passages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS question_number INTEGER;

-- Add index for passage-based queries
CREATE INDEX IF NOT EXISTS idx_test_questions_passage_id ON test_questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_passage_question_number ON test_questions(passage_id, question_number);

-- Add constraint to ensure question_number is set when passage_id is present
ALTER TABLE test_questions
DROP CONSTRAINT IF EXISTS check_passage_question_number;
ALTER TABLE test_questions
ADD CONSTRAINT check_passage_question_number
CHECK (
    (passage_id IS NULL AND question_number IS NULL) OR
    (passage_id IS NOT NULL AND question_number IS NOT NULL AND question_number > 0)
);

-- Add comment to explain the new columns
COMMENT ON COLUMN test_questions.passage_id IS 'References passages table for passage-based questions. NULL for standalone questions.';
COMMENT ON COLUMN test_questions.question_number IS 'Question number within the passage (1, 2, 3, etc.). Only used when passage_id is not NULL.';
