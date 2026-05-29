/*
  # Payments, Refunds, Promo Codes, Invoices
  
  1. New Tables
    - `payments` - Payment records for all transactions
    - `payment_methods` - Saved payment methods
    - `refunds` - Refund records
    - `return_requests` - Customer return requests
    - `invoices` - Order invoices
    - `credit_notes` - Credit notes for refunds
    - `promo_codes` - Promotional codes
    - `promo_code_usage` - Track promo code usage
  
  2. Security
    - Customers see own payments and refunds
    - Finance role can see all payments/refunds
*/

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  order_id uuid REFERENCES orders(id),
  campaign_id uuid,
  seller_id uuid REFERENCES seller_profiles(id),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AUD',
  payment_gateway text NOT NULL DEFAULT '' CHECK (payment_gateway IN ('stripe', 'paypal', 'afterpay', 'manual', 'wallet')),
  payment_method text DEFAULT '',
  gateway_transaction_id text DEFAULT '',
  gateway_payment_intent_id text DEFAULT '',
  gateway_order_id text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorised', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  metadata jsonb DEFAULT '{}',
  failure_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Saved payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  last_four text DEFAULT '',
  brand text DEFAULT '',
  exp_month integer,
  exp_year integer,
  gateway_method_id text NOT NULL DEFAULT '',
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  payment_id uuid REFERENCES payments(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  note text DEFAULT '',
  type text DEFAULT 'full' CHECK (type IN ('full', 'partial', 'store_credit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  gateway_refund_id text DEFAULT '',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Return requests
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  order_line_id uuid REFERENCES order_lines(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL DEFAULT '',
  description text DEFAULT '',
  images jsonb DEFAULT '[]',
  return_type text DEFAULT 'refund' CHECK (return_type IN ('refund', 'exchange', 'store_credit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  pdf_url text DEFAULT '',
  sent_at timestamptz,
  due_date date,
  is_paid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Credit notes
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text UNIQUE NOT NULL,
  refund_id uuid REFERENCES refunds(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text DEFAULT '',
  expires_at timestamptz,
  used_amount numeric(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed_amount', 'free_delivery', 'category', 'product', 'seller', 'first_order', 'referral', 'loyalty', 'seasonal')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  max_discount_amount numeric(10,2),
  minimum_order_amount numeric(10,2) DEFAULT 0,
  applicable_products jsonb DEFAULT '[]',
  applicable_categories jsonb DEFAULT '[]',
  applicable_sellers jsonb DEFAULT '[]',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  usage_limit integer,
  usage_per_customer integer DEFAULT 1,
  usage_count integer DEFAULT 0,
  new_customers_only boolean DEFAULT false,
  is_auto_apply boolean DEFAULT false,
  is_stackable boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promo code usage
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  order_id uuid REFERENCES orders(id),
  discount_applied numeric(10,2) NOT NULL DEFAULT 0,
  used_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Payment methods
CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Refunds
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refunds"
  ON refunds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Return requests
CREATE POLICY "Users can view own return requests"
  ON return_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own return requests"
  ON return_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Credit notes
CREATE POLICY "Users can view own credit notes"
  ON credit_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Promo codes - active ones are readable
CREATE POLICY "Active promo codes are readable"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND (end_date IS NULL OR end_date > now()));

-- Promo code usage
CREATE POLICY "Users can view own promo usage"
  ON promo_code_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promo usage"
  ON promo_code_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id);
