-- Fix existing test results: Mark all existing test results as completed
-- This fixes the issue where all existing results were marked as "In Progress"
-- Run this in your Supabase SQL Editor

-- Update all existing test_results to be marked as completed
-- We can identify completed tests by checking if they have time_taken set
-- (in-progress tests won't have time_taken until they're completed)
UPDATE test_results 
SET is_completed = true 
WHERE is_completed = false 
  AND (time_taken IS NOT NULL OR scaled_score IS NOT NULL);

-- If you want to mark ALL existing test_results as completed (regardless of time_taken),
-- you can run this instead:
-- UPDATE test_results SET is_completed = true WHERE is_completed = false;

