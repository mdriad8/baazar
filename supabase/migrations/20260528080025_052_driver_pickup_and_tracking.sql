/*
  # Driver pickup fix, enhanced RPC, and auto tracking events

  ## Changes

  ### 1. Rebuild get_orders_for_area RPC
  - Drop and recreate with new return columns: customer_name, driver_name, driver_phone
  - Needed because PostgreSQL cannot ALTER return type of existing function

  ### 2. Fix driver orders UPDATE policy
  - Replace recursive driver_can_update_order with simpler is_active_driver() check
  - Drivers can update orders assigned to them OR unassigned (for pickup)

  ### 3. Auto tracking event trigger
  - When any order status changes, auto-insert a customer-visible tracking event
  - Driver status changes flow through to customer/admin/seller tracking timeline
*/

-- Drop old RPC so we can recreate with new signature
DROP FUNCTION IF EXISTS get_orders_for_area(uuid);

CREATE FUNCTION get_orders_for_area(p_area_id uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  status text,
  total_amount numeric,
  delivery_address jsonb,
  driver_id uuid,
  created_at timestamptz,
  contact_email text,
  contact_phone text,
  customer_name text,
  driver_name text,
  driver_phone text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
SELECT
  o.id,
  o.order_number,
  o.status,
  o.total_amount,
  o.delivery_address,
  o.driver_id,
  o.created_at,
  o.contact_email,
  o.contact_phone,
  COALESCE(
    NULLIF(TRIM(COALESCE(cp.first_name,'') || ' ' || COALESCE(cp.last_name,'')), ''),
    o.contact_email,
    'Customer'
  ) AS customer_name,
  CASE WHEN o.driver_id IS NOT NULL THEN
    COALESCE(NULLIF(TRIM(COALESCE(dda.first_name,'') || ' ' || COALESCE(dda.last_name,'')), ''), dda.email)
  END AS driver_name,
  CASE WHEN o.driver_id IS NOT NULL THEN dda.phone END AS driver_phone
FROM orders o
LEFT JOIN customer_profiles cp ON cp.user_id = o.user_id
LEFT JOIN delivery_driver_accounts dda ON dda.user_id = o.driver_id
WHERE
  o.status NOT IN ('draft', 'cancelled', 'delivered', 'refund_processed')
  AND o.payment_status IN ('paid', 'authorised', 'pending')
  AND (
    EXISTS (
      SELECT 1 FROM delivery_areas da
      WHERE da.id = p_area_id
        AND lower(o.delivery_address->>'suburb') = ANY(
          SELECT lower(s) FROM unnest(da.suburbs) AS s
        )
    )
    OR EXISTS (
      SELECT 1 FROM delivery_areas da
      WHERE da.id = p_area_id
        AND (
          (lower(o.delivery_address->>'state') = 'vic' AND lower(da.name) = 'melbourne')
          OR (lower(o.delivery_address->>'state') = 'nsw' AND lower(da.name) = 'sydney')
          OR (lower(o.delivery_address->>'state') = 'qld' AND lower(da.name) = 'brisbane')
          OR (lower(o.delivery_address->>'state') = 'wa'  AND lower(da.name) = 'perth')
          OR (lower(o.delivery_address->>'state') = 'sa'  AND lower(da.name) = 'adelaide')
          OR (lower(o.delivery_address->>'state') = 'act' AND lower(da.name) = 'canberra')
          OR (lower(o.delivery_address->>'state') = 'tas' AND lower(da.name) = 'hobart')
          OR (lower(o.delivery_address->>'state') = 'nt'  AND lower(da.name) = 'darwin')
        )
    )
  )
ORDER BY o.created_at ASC;
$func$;

-- ── Fix driver UPDATE policy ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Drivers can update orders in their area" ON orders;
DROP FUNCTION IF EXISTS driver_can_update_order(uuid);

CREATE OR REPLACE FUNCTION is_active_driver()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM delivery_driver_accounts
    WHERE user_id = auth.uid() AND status = 'active'
  );
$func$;

CREATE POLICY "Drivers can update assigned or unassigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    is_active_driver()
    AND (driver_id = auth.uid() OR driver_id IS NULL)
  )
  WITH CHECK (
    is_active_driver()
  );

-- ── Add SELECT policy so drivers can read orders ──────────────────────────────

DROP POLICY IF EXISTS "Drivers can read orders in their area" ON orders;

CREATE POLICY "Drivers can read orders in their area"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_admin()
    OR seller_can_view_order(id)
    OR is_active_driver()
  );

-- ── Auto tracking event trigger ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_order_tracking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text;
  v_driver_name text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.driver_id IS NOT NULL THEN
    SELECT NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), '')
    INTO v_driver_name
    FROM delivery_driver_accounts
    WHERE user_id = NEW.driver_id;
  END IF;

  v_message := CASE NEW.status
    WHEN 'out_for_delivery' THEN
      'Your order is out for delivery' || COALESCE(' with ' || v_driver_name, '') || '.'
    WHEN 'nearby'           THEN 'Your driver is nearby — please be ready to receive your order.'
    WHEN 'delivered'        THEN 'Your order has been delivered successfully.'
    WHEN 'failed_delivery'  THEN 'Delivery attempt failed. Please contact support to reschedule.'
    WHEN 'picking'          THEN 'Staff are picking your items from the warehouse.'
    WHEN 'packing'          THEN 'Items are being packed and prepared for dispatch.'
    WHEN 'dispatch_ready'   THEN 'Order is ready and waiting for courier pickup.'
    WHEN 'payment_confirmed' THEN 'Payment confirmed. Your order is being processed.'
    WHEN 'cancelled'        THEN 'Order has been cancelled.'
    ELSE 'Order status updated to ' || REPLACE(NEW.status, '_', ' ') || '.'
  END;

  INSERT INTO order_tracking_events (order_id, status, message, is_customer_visible, created_at)
  VALUES (NEW.id, NEW.status, v_message, true, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_order_tracking ON orders;

CREATE TRIGGER trg_auto_order_tracking
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_order_tracking_event();
