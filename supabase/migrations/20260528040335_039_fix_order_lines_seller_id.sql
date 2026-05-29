/*
  # Fix order_lines seller_id population

  ## Problem
  When orders are created, order_lines.seller_id is never populated.
  This causes two issues:
  1. The seller RLS policy "Sellers can view order lines for own products" filters on
     order_lines.seller_id, so it returns nothing (all rows have seller_id = null)
  2. Seller dashboard cannot see orders that contain their products

  ## Changes

  ### 1. Trigger: auto-populate seller_id from products table on order_lines insert
  When a row is inserted into order_lines, look up the product's seller_id and
  set it automatically. This fixes all future orders.

  ### 2. Backfill: update existing order_lines with correct seller_id
  Repairs all historical rows where seller_id is null.

  ### 3. New RLS policy: admins can read all order_lines
  Admins had no SELECT policy on order_lines, blocking the admin orders detail view.

  ### 4. New RLS policy: sellers can view orders that contain their products
  Allows sellers to read the parent orders table for orders containing their products.
*/

-- ── Trigger: auto-populate order_lines.seller_id ─────────────────────────────
CREATE OR REPLACE FUNCTION populate_order_line_seller_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.seller_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT seller_id INTO NEW.seller_id
    FROM products
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_line_seller_id ON order_lines;
CREATE TRIGGER trg_order_line_seller_id
  BEFORE INSERT ON order_lines
  FOR EACH ROW EXECUTE FUNCTION populate_order_line_seller_id();

-- ── Backfill existing rows ────────────────────────────────────────────────────
UPDATE order_lines ol
SET seller_id = p.seller_id
FROM products p
WHERE ol.product_id = p.id
  AND ol.seller_id IS NULL;

-- ── Admin SELECT policy on order_lines ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_lines'
      AND schemaname = 'public'
      AND policyname = 'Admins can view all order lines'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can view all order lines"
        ON order_lines FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
          )
        )
    $pol$;
  END IF;
END $$;

-- ── Sellers can view parent orders that contain their products ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
      AND schemaname = 'public'
      AND policyname = 'Sellers can view orders containing their products'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Sellers can view orders containing their products"
        ON orders FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM order_lines ol
            JOIN seller_users su ON su.seller_id = ol.seller_id
            WHERE ol.order_id = orders.id
              AND su.user_id = auth.uid()
          )
        )
    $pol$;
  END IF;
END $$;
