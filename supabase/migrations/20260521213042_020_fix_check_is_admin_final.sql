/*
  # Fix check_is_admin - pass user_id explicitly, bypass RLS with SECURITY DEFINER

  auth.uid() is unreliable inside SECURITY DEFINER functions called via the
  Supabase JS client RPC. Accept user_id as a parameter so the caller passes
  it explicitly from the session data they already have.
*/

CREATE OR REPLACE FUNCTION public.check_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND r.name = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated, anon;
