-- Backfill question_number for existing questions that don't have it set
-- This ensures all questions have a question_number based on their order within each module

-- First, we need to temporarily drop the constraint that prevents question_number for standalone questions
-- The constraint check_passage_question_number requires: (passage_id IS NULL AND question_number IS NULL) OR (passage_id IS NOT NULL AND question_number IS NOT NULL)
-- We'll update it to allow question_number for standalone questions

-- Drop the existing constraint
ALTER TABLE test_questions
DROP CONSTRAINT IF EXISTS check_passage_question_number;

-- Update questions to have question_number based on question_order within each module
WITH numbered_questions AS (
  SELECT 
    id,
    test_id,
    module_type,
    question_order,
    ROW_NUMBER() OVER (
      PARTITION BY test_id, module_type 
      ORDER BY question_order ASC NULLS LAST, created_at ASC
    ) AS new_question_number
  FROM test_questions
  WHERE passage_id IS NULL -- Only standalone questions (not passage questions)
    AND question_number IS NULL -- Only update questions without question_number
)
UPDATE test_questions
SET question_number = numbered_questions.new_question_number
FROM numbered_questions
WHERE test_questions.id = numbered_questions.id;

-- Recreate the constraint to allow question_number for standalone questions
-- New constraint: passage questions must have question_number, standalone questions can have question_number
ALTER TABLE test_questions
ADD CONSTRAINT check_passage_question_number
CHECK (
    (passage_id IS NULL) OR -- Standalone questions can have or not have question_number
    (passage_id IS NOT NULL AND question_number IS NOT NULL AND question_number > 0) -- Passage questions must have question_number
);

-- Add comment explaining the update
COMMENT ON COLUMN test_questions.question_number IS 'Question number within the module (1, 2, 3, etc.). For standalone questions, this represents the order they were added to the module. The first question added to a module should always be 1.';

