/*
  # Add INSERT policy for order_tracking_events

  ## Problem
  Authenticated users placing orders get a 500 error because there is no INSERT
  RLS policy on order_tracking_events. The checkout page inserts an initial
  "placed" tracking event after creating the order, but RLS blocks it.

  ## Changes
  - Add INSERT policy: users can only insert tracking events for their own orders
  - Add INSERT policy: admins can insert tracking events for any order
*/

CREATE POLICY "Users can insert tracking events for own orders"
  ON order_tracking_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_tracking_events.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert tracking events"
  ON order_tracking_events FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
