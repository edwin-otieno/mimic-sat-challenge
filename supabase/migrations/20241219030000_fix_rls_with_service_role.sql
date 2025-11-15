-- Fix RLS infinite recursion by using a function that truly bypasses RLS
-- This function uses SECURITY DEFINER and is owned by postgres to bypass RLS

-- First, drop all policies that depend on the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Admins can update schools" ON schools;
DROP POLICY IF EXISTS "Admins can delete schools" ON schools;

-- Now drop and recreate the function with proper RLS bypass
DROP FUNCTION IF EXISTS public.is_admin();

CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
PARALLEL SAFE
AS $$
  -- SECURITY DEFINER functions owned by postgres (superuser) bypass RLS
  -- This query will not trigger RLS policies on profiles table
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Ensure function is owned by postgres (superuser)
ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Re-apply the policies to ensure they use the function
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (public.is_admin());

-- Also ensure schools policies use the function
DROP POLICY IF EXISTS "Admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Admins can update schools" ON schools;
DROP POLICY IF EXISTS "Admins can delete schools" ON schools;

CREATE POLICY "Admins can view all schools" ON schools
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert schools" ON schools
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update schools" ON schools
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete schools" ON schools
    FOR DELETE USING (public.is_admin());

