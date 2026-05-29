/*
  # Cart, Wishlist, Orders and Tracking
  
  1. New Tables
    - `cart_items` - Customer shopping cart
    - `wishlist_items` - Customer wishlists
    - `orders` - Main orders table
    - `order_lines` - Individual items in an order
    - `order_tracking_events` - Order status timeline events
  
  2. Security
    - Cart and wishlist are private to each customer
    - Orders are private to customers and relevant sellers
    - Tracking events are readable by order owner
*/

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES skus(id),
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit_type text DEFAULT 'each',
  saved_for_later boolean DEFAULT false,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id, sku_id)
);

-- Wishlist items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  address_id uuid REFERENCES customer_addresses(id),
  delivery_address jsonb DEFAULT '{}',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  delivery_fee numeric(10,2) DEFAULT 0,
  gst_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  promo_code text DEFAULT '',
  promo_code_id uuid,
  order_note text DEFAULT '',
  delivery_slot_date date,
  delivery_slot_time text DEFAULT '',
  preferred_delivery_time text DEFAULT '',
  status text NOT NULL DEFAULT 'placed' CHECK (status IN (
    'draft', 'placed', 'payment_authorised', 'payment_confirmed',
    'stock_allocated', 'picking', 'packing', 'qc_ready', 'dispatch_ready',
    'out_for_delivery', 'nearby', 'delivered', 'failed_delivery',
    'return_requested', 'refund_approved', 'refund_processed', 'cancelled'
  )),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'authorised', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  payment_method text DEFAULT '',
  payment_gateway text DEFAULT '',
  driver_id uuid,
  driver_assigned_at timestamptz,
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  proof_of_delivery_url text DEFAULT '',
  pod_signature_url text DEFAULT '',
  pod_notes text DEFAULT '',
  invoice_number text DEFAULT '',
  invoice_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order lines
CREATE TABLE IF NOT EXISTS order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES skus(id),
  seller_id uuid REFERENCES seller_profiles(id),
  product_name text NOT NULL DEFAULT '',
  product_sku text DEFAULT '',
  product_image_url text DEFAULT '',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit_type text DEFAULT 'each',
  actual_weight numeric(10,3),
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  gst_rate numeric(5,2) DEFAULT 10.00,
  gst_amount numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'picked', 'packed', 'shipped', 'delivered', 'returned', 'refunded')),
  refund_amount numeric(10,2) DEFAULT 0,
  seller_payout_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Order tracking events
CREATE TABLE IF NOT EXISTS order_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT '',
  message text DEFAULT '',
  location_text text DEFAULT '',
  latitude numeric(10,8),
  longitude numeric(11,8),
  updated_by uuid REFERENCES auth.users(id),
  is_customer_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking_events ENABLE ROW LEVEL SECURITY;

-- Cart policies
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Wishlist policies
CREATE POLICY "Users can view own wishlist"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Order lines - customers can view their own
CREATE POLICY "Users can view own order lines"
  ON order_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_lines.order_id AND o.user_id = auth.uid()
    )
  );

-- Sellers can view order lines for their products
CREATE POLICY "Sellers can view order lines for own products"
  ON order_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = order_lines.seller_id AND su.user_id = auth.uid()
    )
  );

-- Order tracking - order owner can view
CREATE POLICY "Users can view own order tracking"
  ON order_tracking_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_tracking_events.order_id AND o.user_id = auth.uid()
      AND order_tracking_events.is_customer_visible = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_seller_id ON order_lines(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking_events(order_id);
