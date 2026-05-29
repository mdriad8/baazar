/*
  # Allow admins to insert and update product_images

  Admins can manage product images for products they create directly via
  the admin panel. Without this policy, the image insert after product
  creation would silently fail due to RLS.
*/

CREATE POLICY "Admins can manage product images"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update product images"
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
