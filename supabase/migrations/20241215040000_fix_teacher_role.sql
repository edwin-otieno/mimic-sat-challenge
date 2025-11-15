-- Force fix for teacher role issue
-- This migration ensures the teacher role is available

-- First, drop and recreate the enum to ensure clean state
DO $$ 
BEGIN
    -- Check if profiles table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- If profiles table exists, we need to handle the role column carefully
        -- First, change the column to text temporarily
        ALTER TABLE profiles ALTER COLUMN role TYPE TEXT;
    END IF;
    
    -- Drop the enum if it exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        DROP TYPE user_role CASCADE;
    END IF;
    
    -- Recreate the enum with all three values
    CREATE TYPE user_role AS ENUM ('admin', 'student', 'teacher');
    
    -- If profiles table exists, convert the role column back to the enum
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Update any invalid role values to 'student' first
        UPDATE profiles SET role = 'student' WHERE role NOT IN ('admin', 'student', 'teacher');
        
        -- Convert the column back to the enum type
        ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
    END IF;
END $$;
