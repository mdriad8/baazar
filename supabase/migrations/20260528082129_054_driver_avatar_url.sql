/*
  # Add avatar_url to delivery_driver_accounts

  Allows drivers to upload a profile photo.
  The column is nullable — no photo is the default.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_driver_accounts' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE delivery_driver_accounts ADD COLUMN avatar_url text DEFAULT NULL;
  END IF;
END $$;

-- Policy: driver can update their own row (for avatar, phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'delivery_driver_accounts' AND policyname = 'Drivers can update own profile'
  ) THEN
    CREATE POLICY "Drivers can update own profile"
      ON delivery_driver_accounts FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Policy: driver can read their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'delivery_driver_accounts' AND policyname = 'Drivers can read own profile'
  ) THEN
    CREATE POLICY "Drivers can read own profile"
      ON delivery_driver_accounts FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR is_admin());
  END IF;
END $$;
