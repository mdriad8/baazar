/*
  # Add FK from orders.driver_id to delivery_driver_accounts.user_id

  PostgREST needs this foreign key to support the
  delivery_driver_accounts(*) relationship query in Supabase client selects.
  Without it, the join returns null even when driver_id is set.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_driver_id_fkey'
      AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_driver_id_fkey
      FOREIGN KEY (driver_id)
      REFERENCES delivery_driver_accounts(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;
