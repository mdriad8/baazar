/*
  # Add FK from product_reviews.user_id -> customer_profiles.user_id (direct)

  Adds the foreign key relationship so PostgREST can resolve the
  product_reviews -> customer_profiles nested join used in the product
  detail page query. Without this the query errors and triggers a 404.
*/

ALTER TABLE product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_user_id_fkey;

ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES customer_profiles(user_id)
  ON DELETE SET NULL;
