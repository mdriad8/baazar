/*
  # Fix campaigns placement constraint + stock decrement on order

  ## Changes

  ### 1. campaigns_placement_check
  The original constraint only allowed: homepage_hero, homepage_featured,
  sponsored_search, category_page, recommended, banner, trending.
  The seller create-campaign UI submits: hero_banner, mid_page, search_results,
  category_page, sidebar — causing a constraint violation on insert.
  New constraint unifies both sets of valid values.

  ### 2. fn_decrement_stock_on_order
  No trigger existed to decrement products.stock_quantity when an order_line is
  inserted. Added AFTER INSERT trigger on order_lines that decrements
  stock_quantity by the ordered quantity and flips stock_status to 'out_of_stock'
  when stock reaches zero.
*/

-- ── 1. Expand placement check constraint ─────────────────────────────────────
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_placement_check;

ALTER TABLE campaigns ADD CONSTRAINT campaigns_placement_check
  CHECK (placement IN (
    'hero_banner',
    'mid_page',
    'search_results',
    'category_page',
    'sidebar',
    'homepage_hero',
    'homepage_featured',
    'sponsored_search',
    'recommended',
    'banner',
    'trending'
  ));

-- ── 2. Stock decrement trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET
    stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - NEW.quantity, 0),
    stock_status   = CASE
                       WHEN GREATEST(COALESCE(stock_quantity, 0) - NEW.quantity, 0) = 0
                       THEN 'out_of_stock'
                       ELSE stock_status
                     END
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON order_lines;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION fn_decrement_stock_on_order();
