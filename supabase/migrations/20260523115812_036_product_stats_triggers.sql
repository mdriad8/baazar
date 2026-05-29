/*
  # Product & Seller Stats Triggers

  ## Summary
  Adds database-level triggers to automatically maintain:
  - `products.purchase_count` — incremented each time an order line for that product is inserted
  - `seller_profiles.total_sales` — incremented by the line_total each time an order line is inserted
  - `seller_profiles.total_products` — kept in sync when products are inserted/deleted

  ## Why triggers?
  The frontend checkout inserts order_lines directly via the Supabase client. Having the
  DB maintain these counters guarantees accuracy regardless of which path created the order.

  ## Tables modified
  - `order_lines` — AFTER INSERT trigger to update product and seller stats
  - `products` — AFTER INSERT / AFTER DELETE trigger to keep seller total_products accurate
*/

-- ── 1. Increment product.purchase_count and seller_profiles.total_sales ──────

CREATE OR REPLACE FUNCTION fn_order_line_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  -- Increment purchase count on the product
  UPDATE products
  SET purchase_count = COALESCE(purchase_count, 0) + NEW.quantity
  WHERE id = NEW.product_id;

  -- Get seller_id from the product (order_line.seller_id may be null for old rows)
  SELECT seller_id INTO v_seller_id
  FROM products
  WHERE id = NEW.product_id;

  -- Increment seller total_sales by line_total
  IF v_seller_id IS NOT NULL THEN
    UPDATE seller_profiles
    SET total_sales = COALESCE(total_sales, 0) + NEW.line_total
    WHERE id = v_seller_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_line_stats ON order_lines;
CREATE TRIGGER trg_order_line_stats
  AFTER INSERT ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION fn_order_line_stats();

-- ── 2. Keep seller_profiles.total_products in sync ────────────────────────────

CREATE OR REPLACE FUNCTION fn_seller_product_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.seller_id IS NOT NULL THEN
    UPDATE seller_profiles
    SET total_products = COALESCE(total_products, 0) + 1
    WHERE id = NEW.seller_id;
  ELSIF TG_OP = 'DELETE' AND OLD.seller_id IS NOT NULL THEN
    UPDATE seller_profiles
    SET total_products = GREATEST(COALESCE(total_products, 0) - 1, 0)
    WHERE id = OLD.seller_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_product_count ON products;
CREATE TRIGGER trg_seller_product_count
  AFTER INSERT OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_seller_product_count();
