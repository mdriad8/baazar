/*
  # Add storage policy for product image uploads

  Allows authenticated users to upload product images to the `products/` folder
  in the avatars bucket. This enables both admin and seller product image uploads.

  1. New Policies
    - Authenticated users can INSERT into `products/` subfolder
    - Authenticated users can UPDATE files in `products/` subfolder
    - Authenticated users can DELETE files in `products/` subfolder
*/

CREATE POLICY "Authenticated can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    name LIKE 'products/%'
  );

CREATE POLICY "Authenticated can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND name LIKE 'products/%')
  WITH CHECK (bucket_id = 'avatars' AND name LIKE 'products/%');

CREATE POLICY "Authenticated can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND name LIKE 'products/%');
