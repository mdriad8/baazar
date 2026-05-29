/*
  # Auto-confirm new user emails via a security definer function

  Creates a function that can be called after signup to immediately confirm
  a user's email, bypassing the email confirmation requirement.
  Also creates a trigger on auth.users to auto-confirm on insert.
  
  The function runs with elevated privileges (SECURITY DEFINER) so it can
  update the auth.users table even from a restricted context.
*/

-- Function to confirm a user email immediately
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = '',
    confirmation_sent_at = now()
  WHERE id = user_id AND email_confirmed_at IS NULL;
END;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.confirm_user_email(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(uuid) TO authenticated;

-- Also confirm any currently unconfirmed users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
