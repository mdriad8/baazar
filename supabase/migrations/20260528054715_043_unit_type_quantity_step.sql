/*
  # Unit type constraint fix + quantity step columns

  1. Changes to `products` table
     - Expand unit_type CHECK constraint to include all values used in the UI:
       'each', 'unit', 'kg', 'g', 'litre', 'ml', 'pack', 'dozen'
     - Add `quantity_step` (numeric): the increment customers must buy in.
       e.g. 0.5 for a product sold per 500g, 1 for discrete units.
       Default: 1
     - Add `min_order_qty` (numeric): minimum quantity a customer must order.
       e.g. 0.5 for a product with a 500g minimum. Default: 1

  2. Notes
     - Both new columns are nullable — existing products default to 1 (treated as
       standard integer quantities in the UI).
     - No existing data is changed.
*/

-- Drop old unit_type constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_type_check;

-- Re-add with all valid values
ALTER TABLE products ADD CONSTRAINT products_unit_type_check
  CHECK (unit_type IN ('each', 'unit', 'kg', 'g', 'litre', 'ml', 'pack', 'dozen'));

-- Add quantity_step column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'quantity_step'
  ) THEN
    ALTER TABLE products ADD COLUMN quantity_step numeric DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Add min_order_qty column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'min_order_qty'
  ) THEN
    ALTER TABLE products ADD COLUMN min_order_qty numeric DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
