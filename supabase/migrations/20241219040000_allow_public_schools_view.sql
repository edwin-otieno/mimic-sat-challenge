-- Allow unauthenticated users to view schools for registration dropdown
-- This is needed because users on the register page are not yet authenticated

-- Drop the existing "Authenticated users can view schools" policy
DROP POLICY IF EXISTS "Authenticated users can view schools" ON schools;

-- Create a new policy that allows anyone (including unauthenticated users) to view schools
-- This is safe because schools only contain public information (name, id)
CREATE POLICY "Anyone can view schools" ON schools
    FOR SELECT USING (true);

-- Note: Admins can still manage schools through the existing admin policies
-- This policy only allows viewing, not inserting/updating/deleting

