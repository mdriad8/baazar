/*
  # Add state column to delivery_driver_accounts

  ## Changes
  - Adds `state` (text) column to store the AU state abbreviation (VIC, NSW, QLD, etc.)
    chosen when creating a driver, as a more intuitive alternative to picking an area.
  - The edge function will use this state to auto-assign the matching delivery area.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_driver_accounts' AND column_name = 'state'
  ) THEN
    ALTER TABLE delivery_driver_accounts ADD COLUMN state text DEFAULT '';
  END IF;
END $$;
