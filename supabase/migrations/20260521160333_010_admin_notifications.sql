/*
  # Admin Notifications Table

  1. New Tables
    - `admin_notifications`
      - `id` (uuid, primary key)
      - `title` (text)
      - `body` (text)
      - `type` (text: info, success, warning, promo)
      - `target_audience` (text: all_customers, all_sellers, all_users)
      - `sent_count` (int)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Only admins can insert/select/delete
*/

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  target_audience text NOT NULL DEFAULT 'all_customers',
  sent_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications"
  ON admin_notifications
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert notifications"
  ON admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete notifications"
  ON admin_notifications
  FOR DELETE
  TO authenticated
  USING (is_admin());
