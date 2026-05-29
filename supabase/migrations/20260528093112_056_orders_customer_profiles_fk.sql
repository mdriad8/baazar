/*
  # Add FK from orders.user_id to customer_profiles.user_id

  Without this FK, PostgREST cannot resolve the `customer_profiles(...)` join
  in the seller dashboard orders query, causing the query to silently return
  no rows instead of the expected orders.

  1. Adds a named FK constraint so Supabase/PostgREST can join orders → customer_profiles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_user_id_fkey_customer_profiles'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_user_id_fkey_customer_profiles
      FOREIGN KEY (user_id) REFERENCES customer_profiles(user_id);
  END IF;
END $$;
