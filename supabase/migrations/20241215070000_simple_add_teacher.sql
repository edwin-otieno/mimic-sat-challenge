-- Simple migration to add teacher role
-- This is the most basic approach

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';
