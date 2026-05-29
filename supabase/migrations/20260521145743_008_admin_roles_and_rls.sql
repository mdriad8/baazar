/*
  # Admin Roles and RLS Policies

  1. Changes
    - Add 'admin' role to roles table if not present
    - Add RLS policies so admins can read all tables
    - Add helper function is_admin() for use in policies
    - Add admin policies on seller_applications, customer_profiles, orders, products, seller_profiles

  2. Security
    - Only users with the 'admin' role (via user_roles) can access admin-restricted data
    - Regular users keep their existing access unchanged
*/

-- Ensure admin role exists
INSERT INTO roles (name, description)
VALUES ('admin', 'Platform administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Helper function: returns true if the calling user has the admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
  );
$$;

-- Admin policies on seller_applications
CREATE POLICY "Admins can view all seller applications"
  ON seller_applications FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update seller applications"
  ON seller_applications FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin policies on seller_profiles
CREATE POLICY "Admins can view all seller profiles"
  ON seller_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert seller profiles"
  ON seller_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update seller profiles"
  ON seller_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin policies on customer_profiles
CREATE POLICY "Admins can view all customer profiles"
  ON customer_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update customer profiles"
  ON customer_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin policies on orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin policies on products
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin policies on categories
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (is_admin());
