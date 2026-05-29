/*
  # Admin access to support tickets and messages

  1. Changes
    - Add SELECT policy on support_tickets for admins (via check_is_admin RPC)
    - Add SELECT policy on support_messages for admins
    - Add INSERT/UPDATE policy on support_messages for admins (staff replies)
    - Add UPDATE policy on support_tickets for admins (change status, assign)

  2. Security
    - Only users confirmed as admin via check_is_admin() can access all tickets
    - Regular users retain existing policies (own tickets only)
*/

-- Admins can read all support tickets
CREATE POLICY "Admins can view all support tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- Admins can update tickets (status, priority, assigned_to, resolution)
CREATE POLICY "Admins can update support tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()))
  WITH CHECK (check_is_admin(auth.uid()));

-- Admins can read all support messages
CREATE POLICY "Admins can view all support messages"
  ON support_messages FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));

-- Admins can insert staff replies
CREATE POLICY "Admins can insert staff messages"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (check_is_admin(auth.uid()) AND is_staff = true);
