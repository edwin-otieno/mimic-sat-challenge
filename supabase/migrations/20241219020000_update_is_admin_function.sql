-- Update is_admin function to properly bypass RLS
-- In Supabase, SECURITY DEFINER functions owned by postgres should bypass RLS
-- However, to be safe, we'll use a workaround by temporarily disabling RLS check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role_val user_role;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- SECURITY DEFINER functions owned by postgres should bypass RLS
  -- Query profiles table - this should bypass RLS because function is SECURITY DEFINER
  -- and owned by postgres (superuser)
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = current_user_id;
  
  RETURN COALESCE(user_role_val = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false
    RETURN false;
END;
$$;

-- Ensure function is owned by postgres (superuser) to bypass RLS
-- This is critical - only superuser-owned SECURITY DEFINER functions can bypass RLS
ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Verify the function is set up correctly
-- The function should now bypass RLS when querying profiles table

