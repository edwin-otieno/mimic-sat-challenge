-- Add teacher to existing user_role enum
-- This migration assumes the enum already exists and just adds the teacher value

-- Add 'teacher' to the existing user_role enum
DO $$ 
BEGIN
    -- Check if 'teacher' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'teacher' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'user_role'
        )
    ) THEN
        -- Add 'teacher' to the user_role enum
        ALTER TYPE user_role ADD VALUE 'teacher';
        RAISE NOTICE 'Added teacher value to user_role enum';
    ELSE
        RAISE NOTICE 'teacher value already exists in user_role enum';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding teacher to enum: %', SQLERRM;
END $$;
