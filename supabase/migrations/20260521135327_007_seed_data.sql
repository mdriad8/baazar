/*
  # Seed Data for Baazar Marketplace
  
  Inserts initial data:
  - Categories (groceries, halal meat, seafood, etc.)
  - Brands (common South Asian brands)
  - Homepage banners (placeholder)
  - Sample promo code
*/

-- Insert root categories
INSERT INTO categories (name, slug, description, sort_order, is_featured, is_active) VALUES
  ('Groceries', 'groceries', 'Everyday grocery essentials', 1, true, true),
  ('Halal Meat', 'halal-meat', 'Fresh and frozen halal certified meat', 2, true, true),
  ('Seafood', 'seafood', 'Fresh and frozen seafood', 3, true, true),
  ('Frozen & Chilled', 'frozen-chilled', 'Frozen meals, ice cream, chilled dairy', 4, true, true),
  ('Rice & Grains', 'rice-grains', 'Basmati, jasmine, and other rice varieties', 5, true, true),
  ('Spices & Condiments', 'spices-condiments', 'Spices, herbs, sauces and condiments', 6, true, true),
  ('Snacks & Sweets', 'snacks-sweets', 'Biscuits, chips, sweets and confectionery', 7, false, true),
  ('Drinks & Beverages', 'drinks-beverages', 'Soft drinks, juices, tea and coffee', 8, false, true),
  ('Household Products', 'household-products', 'Cleaning and household essentials', 9, false, true),
  ('Dairy & Eggs', 'dairy-eggs', 'Milk, cheese, yogurt and eggs', 10, false, true),
  ('Bread & Bakery', 'bread-bakery', 'Fresh bread, roti, naan and pastries', 11, false, true),
  ('Oils & Ghee', 'oils-ghee', 'Cooking oils, ghee and butter', 12, false, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Halal Meat
INSERT INTO categories (name, slug, description, sort_order, is_active, parent_id)
SELECT 'Chicken', 'halal-chicken', 'Whole and cut halal chicken', 1, true, id
FROM categories WHERE slug = 'halal-meat'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description, sort_order, is_active, parent_id)
SELECT 'Lamb & Mutton', 'halal-lamb', 'Halal lamb and mutton cuts', 2, true, id
FROM categories WHERE slug = 'halal-meat'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description, sort_order, is_active, parent_id)
SELECT 'Beef', 'halal-beef', 'Halal beef cuts and mince', 3, true, id
FROM categories WHERE slug = 'halal-meat'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description, sort_order, is_active, parent_id)
SELECT 'Goat', 'halal-goat', 'Halal goat meat', 4, true, id
FROM categories WHERE slug = 'halal-meat'
ON CONFLICT (slug) DO NOTHING;

-- Insert brands
INSERT INTO brands (name, slug, country_of_origin, is_active) VALUES
  ('Basmati Gold', 'basmati-gold', 'Pakistan', true),
  ('Ahmed Foods', 'ahmed-foods', 'Pakistan', true),
  ('Shan', 'shan', 'Pakistan', true),
  ('National Foods', 'national-foods', 'Pakistan', true),
  ('MDH', 'mdh', 'India', true),
  ('Everest', 'everest', 'India', true),
  ('Bombay Kitchen', 'bombay-kitchen', 'Australia', true),
  ('Rooster', 'rooster', 'Australia', true),
  ('Al Kabeer', 'al-kabeer', 'UAE', true),
  ('Shan Foods', 'shan-foods', 'Pakistan', true),
  ('Kohinoor', 'kohinoor', 'India', true),
  ('Lotte', 'lotte', 'South Korea', true),
  ('Tapal', 'tapal', 'Pakistan', true),
  ('Lipton', 'lipton', 'United Kingdom', true),
  ('Pran', 'pran', 'Bangladesh', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert homepage banners
INSERT INTO homepage_banners (title, subtitle, image_url, link_url, link_text, position, sort_order, is_active) VALUES
  ('Fresh Halal Meat Delivered', 'Premium quality halal meat from certified suppliers', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg', '/category/halal-meat', 'Shop Now', 'hero', 1, true),
  ('South Asian Groceries', 'Everything you need from back home, delivered to your door', 'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg', '/products', 'Explore Now', 'hero', 2, true),
  ('Fresh Seafood', 'Sustainably sourced fresh and frozen seafood', 'https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg', '/category/seafood', 'Shop Seafood', 'sub_banner', 1, true)
ON CONFLICT DO NOTHING;

-- Insert sample promo code
INSERT INTO promo_codes (code, name, description, type, discount_value, minimum_order_amount, usage_limit, is_active, start_date)
VALUES
  ('WELCOME10', 'Welcome Discount', '10% off your first order', 'percentage', 10, 30, 1000, true, now()),
  ('FREESHIP', 'Free Shipping', 'Free delivery on orders over $50', 'free_delivery', 0, 50, NULL, true, now()),
  ('FRESH20', 'Fresh 20% Off', '20% off fresh meat and seafood', 'category', 20, 0, 500, true, now())
ON CONFLICT (code) DO NOTHING;
