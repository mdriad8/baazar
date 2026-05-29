/*
  # Add contact_email and contact_phone to orders

  1. Changes
    - Add `contact_email` (text) column to orders — the email address provided at checkout
    - Add `contact_phone` (text) column to orders — the phone number provided at checkout

  2. Notes
    - Both columns are nullable (existing orders have no value)
    - These are indexed for admin search use
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN contact_phone text;
  END IF;
END $$;
