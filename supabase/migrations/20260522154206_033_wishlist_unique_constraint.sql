/*
  # Add unique constraint to wishlist_items

  Ensures each user can only have one wishlist entry per product.
  Required for upsert with onConflict to work when syncing guest wishlist to DB on login.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wishlist_items_user_product_unique'
  ) THEN
    ALTER TABLE wishlist_items
      ADD CONSTRAINT wishlist_items_user_product_unique UNIQUE (user_id, product_id);
  END IF;
END $$;
