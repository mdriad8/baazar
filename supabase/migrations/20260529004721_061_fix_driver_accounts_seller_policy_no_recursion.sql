/*
  # Fix delivery_driver_accounts seller read policy — remove infinite recursion

  The previous policy "Sellers can read driver info for their orders" used
  seller_can_view_order(o.id) inside a subquery on orders. That function is also
  used in the orders RLS SELECT policy, creating an infinite recursion loop that
  crashes any order UPDATE attempted by a driver.

  Replace with a direct join-based check that does NOT go through the orders
  RLS policies (uses order_lines and seller_users directly).
*/

DROP POLICY IF EXISTS "Sellers can read driver info for their orders" ON delivery_driver_accounts;

CREATE POLICY "Sellers can read driver info for their orders"
  ON delivery_driver_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.id
      JOIN seller_users su ON su.seller_id = ol.seller_id
      WHERE o.driver_id = delivery_driver_accounts.user_id
        AND su.user_id = auth.uid()
    )
  );
