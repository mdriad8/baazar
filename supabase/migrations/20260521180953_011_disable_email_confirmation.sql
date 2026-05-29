/*
  # Disable email confirmation requirement

  By default Supabase requires users to confirm their email before they can sign in.
  This migration updates the auth configuration so new sign-ups are immediately
  confirmed and active, allowing users to sign in right after registering without
  needing to click a confirmation email link.

  Note: This is done via the auth.config table which controls Supabase auth behaviour.
*/

-- Mark any existing unconfirmed users as confirmed so they can sign in
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
