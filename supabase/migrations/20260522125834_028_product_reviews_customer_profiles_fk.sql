/*
  # Add FK from product_reviews.user_id to customer_profiles.user_id

  1. Changes
    - Adds a foreign key on product_reviews(user_id) referencing customer_profiles(user_id)
    - This allows Supabase PostgREST to traverse the join:
      product_reviews -> customer_profiles
    - Without this FK, the nested select in the product detail page query errors
      silently and returns null, causing a 404.

  2. Notes
    - Uses ON DELETE SET NULL so reviews are preserved if a profile is deleted
    - customer_profiles.user_id must be unique (it is the PK-equivalent column)
*/

-- Ensure customer_profiles.user_id has a unique index (required for FK target)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'customer_profiles' AND indexname = 'customer_profiles_user_id_key'
  ) THEN
    CREATE UNIQUE INDEX customer_profiles_user_id_key ON customer_profiles(user_id);
  END IF;
END $$;

-- Add FK from product_reviews.user_id -> customer_profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_reviews_user_id_fkey'
      AND table_name = 'product_reviews'
  ) THEN
    ALTER TABLE product_reviews
      ADD CONSTRAINT product_reviews_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES customer_profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;
