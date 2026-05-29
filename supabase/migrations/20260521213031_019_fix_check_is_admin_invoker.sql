/*
  # Fix check_is_admin function to use SECURITY INVOKER

  SECURITY DEFINER causes auth.uid() to return null because the function
  runs as the owner (postgres), not the authenticated caller. SECURITY INVOKER
  inherits the caller's JWT context so auth.uid() resolves correctly.
*/

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
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
