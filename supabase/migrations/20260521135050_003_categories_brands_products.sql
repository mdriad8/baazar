/*
  # Categories, Brands, and Products
  
  1. New Tables
    - `categories` - Product categories with hierarchy
    - `brands` - Product brands
    - `products` - Main product table with all fields
    - `product_images` - Product image gallery
    - `product_tags` - Product tags for search/filtering
    - `product_reviews` - Customer reviews on products
    - `skus` - Product SKU variants
  
  2. Security
    - Products are publicly readable when published
    - Only sellers can manage their own products
    - Products require admin approval before publishing
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id),
  name text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  icon text DEFAULT '',
  sort_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  seo_title text DEFAULT '',
  seo_description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  country_of_origin text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES seller_profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id),
  brand_id uuid REFERENCES brands(id),
  name text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  short_description text DEFAULT '',
  sku text DEFAULT '',
  barcode text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  cost_price numeric(10,2),
  unit_type text DEFAULT 'each' CHECK (unit_type IN ('each', 'kg', 'g', 'litre', 'ml', 'pack')),
  weight_grams numeric(10,3),
  is_variable_weight boolean DEFAULT false,
  stock_quantity integer DEFAULT 0,
  stock_status text DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock', 'pre_order', 'discontinued')),
  low_stock_threshold integer DEFAULT 5,
  is_halal boolean DEFAULT false,
  halal_cert_number text DEFAULT '',
  storage_type text DEFAULT 'ambient' CHECK (storage_type IN ('ambient', 'chilled', 'frozen')),
  allergens jsonb DEFAULT '[]',
  country_of_origin text DEFAULT '',
  storage_instructions text DEFAULT '',
  expiry_days integer,
  ingredients text DEFAULT '',
  nutritional_info jsonb DEFAULT '{}',
  is_featured boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  is_recommended boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_admin_approval', 'approved', 'rejected', 'published', 'hidden', 'suspended')),
  rejection_reason text DEFAULT '',
  admin_note text DEFAULT '',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  seo_title text DEFAULT '',
  seo_description text DEFAULT '',
  view_count integer DEFAULT 0,
  purchase_count integer DEFAULT 0,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product images
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL DEFAULT '',
  alt_text text DEFAULT '',
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Product tags
CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Product reviews
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text DEFAULT '',
  body text DEFAULT '',
  images jsonb DEFAULT '[]',
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product SKUs (variants)
CREATE TABLE IF NOT EXISTS skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code text NOT NULL DEFAULT '',
  variant_name text DEFAULT '',
  attributes jsonb DEFAULT '{}',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  stock_quantity integer DEFAULT 0,
  barcode text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;

-- Categories - publicly readable
CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Brands - publicly readable
CREATE POLICY "Brands are publicly readable"
  ON brands FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Products - published products are public
CREATE POLICY "Published products are publicly readable"
  ON products FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Sellers can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = products.seller_id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = products.seller_id AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = products.seller_id AND su.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_users su
      WHERE su.seller_id = products.seller_id AND su.user_id = auth.uid()
    )
  );

-- Product images - public for published products
CREATE POLICY "Product images publicly readable"
  ON product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_images.product_id AND p.status = 'published'
    )
  );

CREATE POLICY "Sellers can manage own product images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN seller_users su ON su.seller_id = p.seller_id
      WHERE p.id = product_images.product_id AND su.user_id = auth.uid()
    )
  );

-- Product tags - public
CREATE POLICY "Product tags publicly readable"
  ON product_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- Product reviews - published reviews are public
CREATE POLICY "Approved reviews are publicly readable"
  ON product_reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

CREATE POLICY "Users can insert own reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SKUs - public
CREATE POLICY "SKUs publicly readable for published products"
  ON skus FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p WHERE p.id = skus.product_id AND p.status = 'published'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_trending ON products(is_trending);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
