-- Add teacher role to user_role enum
-- Execute this in Supabase SQL Editor if CLI fails

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';
