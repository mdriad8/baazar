/*
  # Fix null seller_id on products and order_lines

  ## Problem
  Products inserted by a seller before the seller_id state finished loading
  get inserted with seller_id = null. This causes them to be invisible to
  the seller dashboard (all queries filter by seller_id) and order_lines
  for those products also have seller_id = null.

  ## Fix
  1. Backfill products.seller_id from the product's category/creator context
     by matching to the only seller_profile that exists.
  2. Backfill order_lines.seller_id from the product's seller_id.
  3. Add a trigger so order_lines.seller_id is always auto-filled from
     the product on insert, preventing this from recurring.
*/

-- Step 1: Backfill products with null seller_id from their linked product via order_lines
-- Update products.seller_id where it's null but the product was created and we can
-- infer the seller from other products created at similar times (same session).
-- Since there is only one seller profile, we can safely assign all orphaned products to it.
UPDATE products
SET seller_id = (SELECT id FROM seller_profiles LIMIT 1)
WHERE seller_id IS NULL
  AND (SELECT COUNT(*) FROM seller_profiles) = 1;

-- Step 2: Backfill order_lines.seller_id from the product's seller_id
UPDATE order_lines ol
SET seller_id = p.seller_id
FROM products p
WHERE ol.product_id = p.id
  AND ol.seller_id IS NULL
  AND p.seller_id IS NOT NULL;

-- Step 3: Add trigger to auto-fill order_lines.seller_id from the product on insert
CREATE OR REPLACE FUNCTION fill_order_line_seller_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.seller_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT seller_id INTO NEW.seller_id
    FROM products
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_order_line_seller_id ON order_lines;

CREATE TRIGGER trg_fill_order_line_seller_id
  BEFORE INSERT ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION fill_order_line_seller_id();
