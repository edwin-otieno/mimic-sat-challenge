-- Fix infinite recursion in profiles RLS policies
-- Create a security definer function to check admin role without triggering RLS

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when checking profiles
  -- This prevents infinite recursion by running with definer's privileges
  -- Set search_path to ensure we're querying the right schema
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role_val = 'admin';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop and recreate admin policies to use the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Admins can view all profiles (using function to avoid recursion)
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (public.is_admin());

-- Admins can update all profiles (using function to avoid recursion)
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (public.is_admin());

-- Also fix schools policies to use the same function
DROP POLICY IF EXISTS "Admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Admins can update schools" ON schools;
DROP POLICY IF EXISTS "Admins can delete schools" ON schools;

-- Allow admins to view all schools
CREATE POLICY "Admins can view all schools" ON schools
    FOR SELECT USING (public.is_admin());

-- Allow admins to insert schools
CREATE POLICY "Admins can insert schools" ON schools
    FOR INSERT WITH CHECK (public.is_admin());

-- Allow admins to update schools
CREATE POLICY "Admins can update schools" ON schools
    FOR UPDATE USING (public.is_admin());

-- Allow admins to delete schools
CREATE POLICY "Admins can delete schools" ON schools
    FOR DELETE USING (public.is_admin());

