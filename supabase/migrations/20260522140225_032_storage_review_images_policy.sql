/*
  # Allow authenticated users to upload review images

  Adds INSERT and SELECT storage policies for the reviews/ path in the avatars bucket.
  Without this, review photo uploads fail with a permission error.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated can upload review images'
  ) THEN
    CREATE POLICY "Authenticated can upload review images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND name LIKE 'reviews/%');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated can update review images'
  ) THEN
    CREATE POLICY "Authenticated can update review images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND name LIKE 'reviews/%')
      WITH CHECK (bucket_id = 'avatars' AND name LIKE 'reviews/%');
  END IF;
END $$;
