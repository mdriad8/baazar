/*
  # Sellers and B2B Seller Applications
  
  1. New Tables
    - `seller_applications` - Applications from B2B sellers wanting to join
    - `seller_profiles` - Approved seller profiles
    - `seller_documents` - Business documents uploaded by sellers
    - `seller_users` - Links auth users to seller profiles
  
  2. Security
    - RLS enabled on all tables
    - Sellers can only see and update their own profiles/documents
    - Admin has full access
  
  3. Important
    - Sellers CANNOT create their own profile - admin must approve or create
    - Seller access is gated by admin approval
*/

-- Seller applications
CREATE TABLE IF NOT EXISTS seller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  business_abn text DEFAULT '',
  business_type text DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text DEFAULT '',
  business_address text DEFAULT '',
  suburb text DEFAULT '',
  state text DEFAULT '',
  postcode text DEFAULT '',
  product_categories jsonb DEFAULT '[]',
  estimated_monthly_revenue numeric(12,2) DEFAULT 0,
  has_halal_cert boolean DEFAULT false,
  has_food_handling_cert boolean DEFAULT false,
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'on_hold')),
  reviewed_by uuid REFERENCES auth.users(id),
  review_note text DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seller profiles (created/approved by admin)
CREATE TABLE IF NOT EXISTS seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES seller_applications(id),
  slug text UNIQUE NOT NULL,
  business_name text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  logo_url text DEFAULT '',
  banner_url text DEFAULT '',
  business_abn text DEFAULT '',
  business_type text DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text DEFAULT '',
  business_address text DEFAULT '',
  suburb text DEFAULT '',
  state text DEFAULT '',
  postcode text DEFAULT '',
  country text DEFAULT 'Australia',
  product_categories jsonb DEFAULT '[]',
  commission_rate numeric(5,2) DEFAULT 10.00,
  payment_terms text DEFAULT 'net30',
  bank_account_name text DEFAULT '',
  bank_bsb text DEFAULT '',
  bank_account_number text DEFAULT '',
  is_featured boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  total_products integer DEFAULT 0,
  total_sales numeric(12,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seller documents
CREATE TABLE IF NOT EXISTS seller_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT '',
  document_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_size integer DEFAULT 0,
  expiry_date date,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Seller users (links auth users to seller profiles)
CREATE TABLE IF NOT EXISTS seller_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, seller_id)
);

-- Enable RLS
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_users ENABLE ROW LEVEL SECURITY;

-- Seller applications policies
CREATE POLICY "Anyone can submit a seller application"
  ON seller_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications"
  ON seller_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Seller profiles - public read for active sellers
CREATE POLICY "Active seller profiles are publicly readable"
  ON seller_profiles FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Sellers can view own profile"
  ON seller_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = seller_profiles.id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update own profile"
  ON seller_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = seller_profiles.id AND su.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = seller_profiles.id AND su.user_id = auth.uid()
    )
  );

-- Seller documents policies
CREATE POLICY "Sellers can view own documents"
  ON seller_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = seller_documents.seller_id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can upload own documents"
  ON seller_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = seller_documents.seller_id AND su.user_id = auth.uid()
    )
  );

-- Seller users policies
CREATE POLICY "Sellers can view own seller_users"
  ON seller_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_slug ON seller_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(status);
CREATE INDEX IF NOT EXISTS idx_seller_users_user_id ON seller_users(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_users_seller_id ON seller_users(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_documents_seller_id ON seller_documents(seller_id);
