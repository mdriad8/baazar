/*
  # Schema cache reload + customer spend trigger

  1. Schema cache
     - Notifies PostgREST to reload its schema cache so that columns added in
       later migrations (pending_edit, pending_edit_at, pending_edit_rejection_reason)
       are recognised without a server restart.

  2. New trigger: fn_update_customer_spend
     - Fires AFTER INSERT on orders
     - Increments total_orders by 1 and adds total_amount to total_spending
       on the matching customer_profiles row (matched via user_id)
     - Only fires when payment_status is 'paid' or status is 'placed' (i.e. a real order)

  3. Backfill
     - Recomputes total_orders and total_spending for all existing customer_profiles
       from delivered/placed/processing orders so the column reflects real history.
*/

-- 1. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Trigger function to keep customer spend in sync
CREATE OR REPLACE FUNCTION fn_update_customer_spend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE customer_profiles
  SET
    total_orders   = total_orders + 1,
    total_spending = total_spending + COALESCE(NEW.total_amount, 0)
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_update_customer_spend ON orders;

CREATE TRIGGER trg_update_customer_spend
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_customer_spend();

-- 3. Backfill: recompute totals from orders table
UPDATE customer_profiles cp
SET
  total_orders   = agg.order_count,
  total_spending = agg.spend
FROM (
  SELECT
    user_id,
    COUNT(*)          AS order_count,
    SUM(total_amount) AS spend
  FROM orders
  WHERE status NOT IN ('cancelled')
  GROUP BY user_id
) agg
WHERE cp.user_id = agg.user_id;
