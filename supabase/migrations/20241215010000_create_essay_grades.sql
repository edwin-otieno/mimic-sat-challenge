-- Create table to store teacher/admin grading for ACT Writing essays
create table if not exists essay_grades (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references test_results(id) on delete cascade,
  grader_id uuid not null references auth.users(id) on delete cascade,
  score integer check (score between 0 and 12),
  comments text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Useful indexes
create index if not exists idx_essay_grades_test_result_id on essay_grades(test_result_id);
create index if not exists idx_essay_grades_grader_id on essay_grades(grader_id);

-- Enable RLS
alter table essay_grades enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Teachers and admins can manage essay grades" on essay_grades;
drop policy if exists "Students can view their own essay grades" on essay_grades;

-- Policy: Teachers and admins can select/insert/update/delete
create policy "Teachers and admins can manage essay grades"
  on essay_grades
  for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin','teacher')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin','teacher')
    )
  );

-- Policy: Students can view grades linked to their own test_result
create policy "Students can view their own essay grades"
  on essay_grades
  for select
  using (
    test_result_id in (
      select tr.id from test_results tr where tr.user_id = auth.uid()
    )
  );

