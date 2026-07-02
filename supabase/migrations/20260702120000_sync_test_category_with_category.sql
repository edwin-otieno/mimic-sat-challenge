-- Keep test_category aligned with category for rows where they diverged
UPDATE tests
SET test_category = category
WHERE category IS NOT NULL
  AND category IN ('SAT', 'ACT')
  AND (test_category IS NULL OR test_category != category);
