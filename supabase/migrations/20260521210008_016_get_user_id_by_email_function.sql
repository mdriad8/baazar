/*
  # Add get_user_id_by_email helper function

  Allows admin to look up an auth user's UUID by email address,
  used when manually linking a user account to a seller profile.
  Only callable by authenticated users with the admin role.
*/

CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT id INTO found_id FROM auth.users WHERE email = lookup_email LIMIT 1;
  RETURN found_id;
END;
$$;
