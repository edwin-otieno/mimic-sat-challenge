-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all schools
CREATE POLICY "Admins can view all schools" ON schools
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow admins to insert schools
CREATE POLICY "Admins can insert schools" ON schools
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow admins to update schools
CREATE POLICY "Admins can update schools" ON schools
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow admins to delete schools
CREATE POLICY "Admins can delete schools" ON schools
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow all authenticated users to view schools (for registration dropdown)
CREATE POLICY "Authenticated users can view schools" ON schools
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add school_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

