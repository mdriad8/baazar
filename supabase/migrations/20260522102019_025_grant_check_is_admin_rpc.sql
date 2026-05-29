/*
  # Grant execute on check_is_admin to authenticated and anon roles

  The check_is_admin RPC needs to be callable by authenticated users 
  (and the anon role for the login page which calls it immediately after sign-in
  before the session cookie propagates).
*/

GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO anon;
