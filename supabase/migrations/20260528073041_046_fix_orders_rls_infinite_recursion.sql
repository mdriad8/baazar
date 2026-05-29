/*
  # Fix infinite recursion in orders/order_lines RLS policies

  ## Problem
  Infinite recursion occurs when placing an order:
  - The "Sellers can view orders containing their products" policy on `orders`
    does a subquery into `order_lines`
  - The "Users can view own order lines" policy on `order_lines`
    does a subquery back into `orders`
  - PostgreSQL enters an infinite loop evaluating these mutual references

  ## Fix
  1. Drop the circular seller policy on `orders`
  2. Replace it with a SECURITY DEFINER function that bypasses RLS when
     checking seller access, breaking the recursion cycle
  3. Similarly fix the order_lines insert policy which also queries orders
     (causing recursion when orders INSERT triggers order_lines visibility check)
*/

-- Step 1: Drop the recursive seller policy on orders
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON orders;

-- Step 2: Create a SECURITY DEFINER function to check seller order access
-- This runs as the function owner (bypasses RLS) so no recursive policy evaluation
CREATE OR REPLACE FUNCTION seller_can_view_order(order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_lines ol
    JOIN seller_users su ON su.seller_id = ol.seller_id
    WHERE ol.order_id = seller_can_view_order.order_id
      AND su.user_id = auth.uid()
  );
$$;

-- Step 3: Re-create the seller policy using the non-recursive function
CREATE POLICY "Sellers can view orders containing their products"
  ON orders FOR SELECT
  TO authenticated
  USING (seller_can_view_order(id));

-- Step 4: Drop and re-create the order_lines INSERT policy
-- Original queries orders directly which can recurse; use a SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can insert order lines for own orders" ON order_lines;

CREATE OR REPLACE FUNCTION user_owns_order(order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = user_owns_order.order_id
      AND o.user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can insert order lines for own orders"
  ON order_lines FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_order(order_id));

-- Step 5: Fix order_tracking_events INSERT policy the same way
DROP POLICY IF EXISTS "Users can insert tracking events for own orders" ON order_tracking_events;

CREATE POLICY "Users can insert tracking events for own orders"
  ON order_tracking_events FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_order(order_id));

-- Step 6: Fix order_tracking_events SELECT policy (also queries orders)
DROP POLICY IF EXISTS "Users can view own order tracking" ON order_tracking_events;

CREATE OR REPLACE FUNCTION user_can_view_tracking(order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = user_can_view_tracking.order_id
      AND o.user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view own order tracking"
  ON order_tracking_events FOR SELECT
  TO authenticated
  USING (is_customer_visible = true AND user_can_view_tracking(order_id));

-- Step 7: Fix order_lines SELECT policy (queries orders - can recurse)
DROP POLICY IF EXISTS "Users can view own order lines" ON order_lines;

CREATE POLICY "Users can view own order lines"
  ON order_lines FOR SELECT
  TO authenticated
  USING (user_owns_order(order_id));
