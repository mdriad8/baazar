/*
  # Add support_messages table

  1. New Tables
    - `support_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, FK to support_tickets)
      - `user_id` (uuid, FK to auth.users)
      - `body` (text)
      - `is_staff` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can read messages for their own tickets
    - Users can insert messages for their own open/in-progress tickets
*/

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_staff boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages on their own tickets"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_messages.ticket_id
      AND st.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages on their own open tickets"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND st.user_id = auth.uid()
      AND st.status NOT IN ('closed', 'resolved')
    )
  );
