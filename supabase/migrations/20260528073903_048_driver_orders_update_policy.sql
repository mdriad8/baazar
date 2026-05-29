/*
  # Add driver UPDATE policies for orders

  ## Problem
  Drivers cannot pick up orders or update order status because the only UPDATE
  policy on the orders table is for admins. When a driver taps "Pick Up Order"
  or changes a status it silently fails.

  ## Changes
  1. Add UPDATE policy: drivers can update orders assigned to their area
     (for pickup - assigning driver_id) or already assigned to themselves
     (for status progression).
  2. Uses SECURITY DEFINER helper to avoid recursion.
*/

-- Helper: check if the calling user is a driver assigned to the area that covers this order
CREATE OR REPLACE FUNCTION driver_can_update_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1
    FROM delivery_driver_accounts dda
    JOIN delivery_areas da ON da.id = dda.area_id
    JOIN orders o ON o.id = p_order_id
    WHERE dda.user_id = auth.uid()
      AND dda.status = 'active'
      AND (
        -- driver is already assigned to this order
        o.driver_id = dda.user_id
        -- or order is in the driver's area (for pickup)
        OR lower(o.delivery_address->>'state') = CASE lower(da.name)
          WHEN 'melbourne' THEN 'vic'
          WHEN 'sydney'    THEN 'nsw'
          WHEN 'brisbane'  THEN 'qld'
          WHEN 'perth'     THEN 'wa'
          WHEN 'adelaide'  THEN 'sa'
          WHEN 'canberra'  THEN 'act'
          WHEN 'hobart'    THEN 'tas'
          WHEN 'darwin'    THEN 'nt'
          ELSE ''
        END
        OR lower(o.delivery_address->>'suburb') = ANY(
          SELECT lower(s) FROM unnest(da.suburbs) AS s
        )
      )
  );
$func$;

-- Allow drivers to update orders in their area or assigned to them
CREATE POLICY "Drivers can update orders in their area"
  ON orders FOR UPDATE
  TO authenticated
  USING (driver_can_update_order(id))
  WITH CHECK (driver_can_update_order(id));
