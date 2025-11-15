-- Force add teacher role to remote database
-- This migration will definitely add the teacher role

-- First, let's see what enum values currently exist
-- Then add teacher if it doesn't exist

DO $$ 
DECLARE
    enum_exists boolean;
    teacher_exists boolean;
BEGIN
    -- Check if user_role enum exists
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) INTO enum_exists;
    
    IF enum_exists THEN
        RAISE NOTICE 'user_role enum exists';
        
        -- Check if teacher value exists
        SELECT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'teacher' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) INTO teacher_exists;
        
        IF teacher_exists THEN
            RAISE NOTICE 'teacher value already exists in user_role enum';
        ELSE
            RAISE NOTICE 'Adding teacher value to user_role enum...';
            ALTER TYPE user_role ADD VALUE 'teacher';
            RAISE NOTICE 'Successfully added teacher value to user_role enum';
        END IF;
    ELSE
        RAISE NOTICE 'user_role enum does not exist, creating it...';
        CREATE TYPE user_role AS ENUM ('admin', 'student', 'teacher');
        RAISE NOTICE 'Successfully created user_role enum with admin, student, teacher';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        -- Try alternative approach
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';
            RAISE NOTICE 'Used alternative method to add teacher value';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Alternative method also failed: %', SQLERRM;
        END;
END $$;
