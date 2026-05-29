/*
  # Add notification preferences to customer_profiles and create platform_settings table

  1. Changes to customer_profiles
     - notification_email_orders (bool, default true)
     - notification_email_promos (bool, default true)
     - notification_sms (bool, default false)

  2. New Table: platform_settings
     - key/value store for admin-configurable settings
     - Seeded with defaults for site, delivery, and seller config

  3. Security
     - RLS on platform_settings: admins can update, all authenticated can read
*/

-- Notification preference columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'notification_email_orders') THEN
    ALTER TABLE customer_profiles ADD COLUMN notification_email_orders boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'notification_email_promos') THEN
    ALTER TABLE customer_profiles ADD COLUMN notification_email_promos boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_profiles' AND column_name = 'notification_sms') THEN
    ALTER TABLE customer_profiles ADD COLUMN notification_sms boolean DEFAULT false;
  END IF;
END $$;

-- Platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Seed defaults
INSERT INTO platform_settings (key, value) VALUES
  ('site_name', 'Baazar'),
  ('site_email', 'support@baazar.com.au'),
  ('site_phone', '+61 2 9000 0000'),
  ('currency', 'AUD'),
  ('timezone', 'Australia/Sydney'),
  ('free_delivery_threshold', '80'),
  ('standard_delivery_fee', '9.99'),
  ('express_delivery_fee', '19.99'),
  ('same_day_cutoff', '12:00'),
  ('delivery_cities', 'Sydney, Melbourne, Brisbane, Perth'),
  ('default_commission_rate', '10'),
  ('approval_required', 'true'),
  ('product_approval_required', 'true'),
  ('min_payout_amount', '50')
ON CONFLICT (key) DO NOTHING;
