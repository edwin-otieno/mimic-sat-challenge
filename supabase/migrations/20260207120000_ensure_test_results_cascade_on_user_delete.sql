-- Ensure test_results.user_id has ON DELETE CASCADE to auth.users(id)
-- so that when a user is deleted (e.g. by cleanup-old-accounts), their test_results
-- (and thus module_results, essay_grades for those results) are removed by the DB.
DO $$
DECLARE
  con_name text;
  con_delete_rule text;
BEGIN
  SELECT c.conname, c.confdeltype::text
  INTO con_name, con_delete_rule
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE t.relname = 'test_results'
    AND n.nspname = 'public'
    AND c.contype = 'f'
    AND array_length(c.conkey, 1) = 1
    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1] AND NOT a.attisdropped) = 'user_id';

  IF con_name IS NOT NULL AND con_delete_rule IS DISTINCT FROM 'c' THEN
    EXECUTE format('ALTER TABLE public.test_results DROP CONSTRAINT %I', con_name);
    ALTER TABLE public.test_results
      ADD CONSTRAINT test_results_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSIF con_name IS NULL THEN
    -- Column or table might not exist in this schema; skip
    NULL;
  END IF;
END $$;
