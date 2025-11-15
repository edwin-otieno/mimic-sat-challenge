-- Add sentence_references column to test_questions table
-- This stores an array of sentence indices (0-based) that are relevant to each question
ALTER TABLE test_questions 
ADD COLUMN IF NOT EXISTS sentence_references JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN test_questions.sentence_references IS 'Array of sentence indices (0-based integers) in the passage that are relevant to this question. Only used when passage_id is not NULL.';

