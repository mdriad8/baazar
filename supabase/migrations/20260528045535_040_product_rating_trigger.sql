/*
  # Product rating stats trigger

  ## Problem
  products.rating_average and rating_count are never updated when reviews are
  added, approved, or deleted. Both columns stay at 0, so no stars appear on
  product cards even when approved reviews exist.

  ## Changes

  ### 1. Trigger function: recalculate rating stats on product_reviews change
  Fires AFTER INSERT, UPDATE, or DELETE on product_reviews.
  Recomputes rating_average and rating_count from all approved (is_approved = true)
  reviews for the affected product and writes them back to products.

  ### 2. Trigger: attached to product_reviews for all row-level changes

  ### 3. Backfill: update all products that currently have approved reviews
*/

-- ── Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Determine which product was affected
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE products
  SET
    rating_count   = (
      SELECT COUNT(*) FROM product_reviews
      WHERE product_id = v_product_id AND is_approved = true
    ),
    rating_average = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM product_reviews
      WHERE product_id = v_product_id AND is_approved = true
    )
  WHERE id = v_product_id;

  RETURN NULL;
END;
$$;

-- ── Attach trigger ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_product_rating ON product_reviews;
CREATE TRIGGER trg_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_product_rating();

-- ── Backfill existing products ────────────────────────────────────────────────
UPDATE products p
SET
  rating_count = sub.cnt,
  rating_average = sub.avg_rating
FROM (
  SELECT
    product_id,
    COUNT(*) AS cnt,
    ROUND(AVG(rating)::numeric, 2) AS avg_rating
  FROM product_reviews
  WHERE is_approved = true
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;
