/*
  # Ad Campaigns, Inventory, Delivery, and Support
  
  1. New Tables
    - `campaigns` - Seller ad/boosting campaigns
    - `ad_impressions` / `ad_clicks` - Ad analytics
    - `ad_billing_events` - Ad payment tracking
    - `inventory_lots` - Inventory management
    - `stock_movements` - Stock in/out tracking
    - `drivers` - Delivery driver profiles
    - `delivery_runs` / `delivery_stops` - Delivery management
    - `support_tickets` - Customer/seller support
    - `notifications` - Platform notifications
    - `homepage_banners` - Homepage promotional banners
    - `audit_logs` - System audit trail
    - `user_behavior_events` - Behavior tracking for recommendations
    - `seller_settlement_runs` / `seller_settlement_lines` - Seller payouts
*/

-- Ad campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  ad_type text NOT NULL DEFAULT 'sponsored' CHECK (ad_type IN ('sponsored_product', 'banner', 'hero', 'featured', 'trending_boost', 'category_boost', 'search_boost')),
  placement text NOT NULL DEFAULT '' CHECK (placement IN ('homepage_hero', 'homepage_featured', 'sponsored_search', 'category_page', 'recommended', 'banner', 'trending')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  number_of_days integer NOT NULL DEFAULT 1,
  daily_budget numeric(10,2) NOT NULL DEFAULT 0,
  total_budget numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) DEFAULT 0,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_gateway text DEFAULT '',
  payment_id uuid REFERENCES payments(id),
  bid_amount numeric(8,4) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'paid', 'pending_admin_approval', 'approved', 'active', 'paused', 'rejected', 'expired', 'budget_finished', 'cancelled')),
  admin_approval_status text DEFAULT 'pending' CHECK (admin_approval_status IN ('pending', 'approved', 'rejected')),
  admin_note text DEFAULT '',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  spend numeric(12,2) DEFAULT 0,
  roas numeric(8,4) DEFAULT 0,
  relevance_score numeric(5,4) DEFAULT 0,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad impressions
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  session_id text DEFAULT '',
  page_context text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Ad clicks
CREATE TABLE IF NOT EXISTS ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  session_id text DEFAULT '',
  resulted_in_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Seller settlement runs
CREATE TABLE IF NOT EXISTS seller_settlement_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_sales numeric(12,2) DEFAULT 0,
  commission_amount numeric(12,2) DEFAULT 0,
  platform_fees numeric(12,2) DEFAULT 0,
  refund_deductions numeric(12,2) DEFAULT 0,
  ad_spend_deductions numeric(12,2) DEFAULT 0,
  net_payout numeric(12,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'on_hold')),
  paid_at timestamptz,
  bank_reference text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Seller settlement lines
CREATE TABLE IF NOT EXISTS seller_settlement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES seller_settlement_runs(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id),
  order_line_id uuid REFERENCES order_lines(id),
  gross_amount numeric(12,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 0,
  commission_amount numeric(12,2) DEFAULT 0,
  net_amount numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Inventory lots
CREATE TABLE IF NOT EXISTS inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES skus(id),
  lot_number text DEFAULT '',
  batch_number text DEFAULT '',
  expiry_date date,
  best_before_date date,
  quantity_received integer NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  quantity_allocated integer DEFAULT 0,
  quantity_sold integer DEFAULT 0,
  location text DEFAULT '',
  supplier_name text DEFAULT '',
  cost_price numeric(10,2) DEFAULT 0,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  sku_id uuid REFERENCES skus(id),
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'return', 'write_off', 'transfer')),
  quantity numeric(10,3) NOT NULL DEFAULT 0,
  reference_type text DEFAULT '',
  reference_id uuid,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  license_number text DEFAULT '',
  vehicle_type text DEFAULT '',
  vehicle_rego text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'on_leave')),
  current_latitude numeric(10,8),
  current_longitude numeric(11,8),
  last_location_update timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Delivery runs
CREATE TABLE IF NOT EXISTS delivery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL,
  driver_id uuid REFERENCES drivers(id),
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  total_stops integer DEFAULT 0,
  completed_stops integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Delivery stops
CREATE TABLE IF NOT EXISTS delivery_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES delivery_runs(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id),
  stop_sequence integer NOT NULL DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'delivered', 'failed', 'skipped')),
  eta timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  failure_reason text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  order_id uuid REFERENCES orders(id),
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text DEFAULT 'general' CHECK (category IN ('general', 'order', 'payment', 'delivery', 'refund', 'product', 'account', 'seller', 'technical')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled')),
  assigned_to uuid REFERENCES auth.users(id),
  images jsonb DEFAULT '[]',
  resolution text DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text DEFAULT 'info' CHECK (type IN ('info', 'order', 'payment', 'promotion', 'delivery', 'review', 'system', 'ad', 'settlement')),
  reference_type text DEFAULT '',
  reference_id uuid,
  is_read boolean DEFAULT false,
  action_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Homepage banners
CREATE TABLE IF NOT EXISTS homepage_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  mobile_image_url text DEFAULT '',
  link_url text DEFAULT '',
  link_text text DEFAULT '',
  position text DEFAULT 'hero' CHECK (position IN ('hero', 'sub_banner', 'sidebar', 'footer')),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  campaign_id uuid REFERENCES campaigns(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL DEFAULT '',
  resource_type text NOT NULL DEFAULT '',
  resource_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- User behavior events (for recommendation engine)
CREATE TABLE IF NOT EXISTS user_behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  session_id text DEFAULT '',
  event_type text NOT NULL CHECK (event_type IN ('view', 'search', 'category_click', 'add_to_cart', 'wishlist', 'purchase', 'review', 'ad_click', 'ad_ignore')),
  product_id uuid REFERENCES products(id),
  category_id uuid REFERENCES categories(id),
  search_query text DEFAULT '',
  extra_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Recommendation profiles
CREATE TABLE IF NOT EXISTS recommendation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id),
  preferred_categories jsonb DEFAULT '[]',
  preferred_brands jsonb DEFAULT '[]',
  price_range_min numeric(10,2) DEFAULT 0,
  price_range_max numeric(10,2) DEFAULT 500,
  behaviour_score jsonb DEFAULT '{}',
  last_computed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Search logs
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  session_id text DEFAULT '',
  query text NOT NULL DEFAULT '',
  results_count integer DEFAULT 0,
  clicked_product_id uuid REFERENCES products(id),
  created_at timestamptz DEFAULT now()
);

-- Loyalty points
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id),
  points_earned integer DEFAULT 0,
  points_used integer DEFAULT 0,
  balance_after integer DEFAULT 0,
  description text DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  reference_type text DEFAULT '',
  reference_id uuid,
  description text DEFAULT '',
  balance_after numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_settlement_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_settlement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Campaign policies
CREATE POLICY "Sellers can view own campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = campaigns.seller_id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can insert own campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = campaigns.seller_id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update own campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = campaigns.seller_id AND su.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = campaigns.seller_id AND su.user_id = auth.uid()
    )
  );

-- Active campaigns are publicly readable (for ad rendering)
CREATE POLICY "Active campaigns are publicly readable"
  ON campaigns FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND admin_approval_status = 'approved');

-- Seller settlements
CREATE POLICY "Sellers can view own settlements"
  ON seller_settlement_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = seller_settlement_runs.seller_id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view own settlement lines"
  ON seller_settlement_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_settlement_runs ssr
      JOIN seller_users su ON su.seller_id = ssr.seller_id
      WHERE ssr.id = seller_settlement_lines.settlement_id AND su.user_id = auth.uid()
    )
  );

-- Support tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Homepage banners - public read
CREATE POLICY "Active banners are publicly readable"
  ON homepage_banners FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- User behavior events - users can insert
CREATE POLICY "Users can insert own behavior events"
  ON user_behavior_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recommendation profiles
CREATE POLICY "Users can view own recommendation profile"
  ON recommendation_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Loyalty points
CREATE POLICY "Users can view own loyalty points"
  ON loyalty_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Wallet transactions
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Drivers can view own delivery data
CREATE POLICY "Drivers can view own driver profile"
  ON drivers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_seller_id ON campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_product_id ON campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_placement ON campaigns(placement);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_user_id ON user_behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_product_id ON user_behavior_events(product_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
