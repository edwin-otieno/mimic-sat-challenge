ALTER TABLE tests
ADD COLUMN IF NOT EXISTS test_variant TEXT DEFAULT 'full',
ADD COLUMN IF NOT EXISTS source_test_id UUID REFERENCES tests(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tests_test_variant_check'
  ) THEN
    ALTER TABLE tests
    ADD CONSTRAINT tests_test_variant_check
    CHECK (test_variant IN ('full', 'mini'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tests_test_variant ON tests(test_variant);
CREATE INDEX IF NOT EXISTS idx_tests_source_test_id ON tests(source_test_id);

UPDATE tests
SET test_variant = 'full'
WHERE test_variant IS NULL;
