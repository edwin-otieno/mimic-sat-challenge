-- Run this in Supabase SQL Editor to list student accounts older than 6 months.
-- These are the accounts that the cleanup-old-accounts job would delete when it runs.

SELECT
  id,
  email,
  role,
  created_at,
  now() - created_at AS age
FROM public.profiles
WHERE role = 'student'
  AND created_at < (now() - interval '6 months')
ORDER BY created_at ASC;
