/*
  # Add INSERT policy for order_lines

  ## Problem
  The order_lines table has RLS enabled with only SELECT policies.
  When a customer places an order, the INSERT for order lines is silently
  blocked by RLS, resulting in orders with no items.

  ## Fix
  Add an INSERT policy that allows authenticated users to insert order lines
  only for orders that belong to them.
*/

CREATE POLICY "Users can insert order lines for own orders"
  ON order_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_lines.order_id
        AND o.user_id = auth.uid()
    )
  );
