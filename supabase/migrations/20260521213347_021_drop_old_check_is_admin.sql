/*
  # Drop the old no-argument check_is_admin function

  Two overloads existed causing ambiguous RPC calls from the JS client.
  Only the version that accepts p_user_id uuid should remain.
*/

DROP FUNCTION IF EXISTS public.check_is_admin();
