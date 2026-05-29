/*
  # Add contact_email to support_tickets

  1. Changes
    - Add `contact_email` column to support_tickets (stored at creation time)
    - Add RPC function get_ticket_user_emails for admins to fetch user emails from auth.users

  2. Notes
    - Storing email on the ticket ensures it's always available even if user is deleted
    - The RPC function uses security definer to access auth.users safely
*/

-- Add contact_email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN contact_email text DEFAULT '';
  END IF;
END $$;

-- Function for admins to get user email by user_id
CREATE OR REPLACE FUNCTION get_user_email(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT check_is_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_email(uuid) TO authenticated;
