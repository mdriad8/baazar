/*
  # Add delivery_failure_note to orders

  Stores the driver's explanation when a delivery attempt fails.
  Visible to admin, seller, and the customer.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_failure_note'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_failure_note text DEFAULT NULL;
  END IF;
END $$;
