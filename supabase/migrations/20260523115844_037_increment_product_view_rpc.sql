/*
  # Add increment_product_view RPC

  Creates a simple RPC that increments view_count on a product.
  Called from the client (ProductDetail) once per page load.
  Security definer so it works without needing an authenticated user.
*/

CREATE OR REPLACE FUNCTION increment_product_view(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_product_id;
END;
$$;

-- Allow anonymous and authenticated users to call it
GRANT EXECUTE ON FUNCTION increment_product_view(uuid) TO anon, authenticated;
