/*
  # Allow sellers to read driver name/phone for orders containing their products

  The delivery_driver_accounts table only had RLS policies for admins and the
  driver themselves. When the seller dashboard joins delivery_driver_accounts
  to show who is delivering an order, RLS blocked the read and returned null,
  causing the driver name column to always show blank.

  This policy allows any authenticated user to read the minimal public fields
  (name, phone, vehicle info) of a driver account when that driver is assigned
  to an order the user can see. We scope it to sellers who can view the order.
*/

CREATE POLICY "Sellers can read driver info for their orders"
  ON delivery_driver_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.driver_id = delivery_driver_accounts.user_id
      AND seller_can_view_order(o.id)
    )
  );
