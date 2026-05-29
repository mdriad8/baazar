/*
  # Add is_admin_check RPC function

  Creates a security definer function that returns true if the calling
  authenticated user has the admin role. Bypasses RLS entirely so the
  admin login page always gets a reliable answer.
*/

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
