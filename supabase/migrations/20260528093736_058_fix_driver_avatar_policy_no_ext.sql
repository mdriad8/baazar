/*
  # Fix driver avatar storage policy for extensionless path

  The driver avatar is now uploaded to `driver-avatars/{user_id}` (no extension)
  using the file's content-type. Update policies to allow both patterns:
  - driver-avatars/{uid}         (extensionless, new format)
  - driver-avatars/{uid}.%       (with extension, old format — keep for backwards compat)
*/

DROP POLICY IF EXISTS "Drivers can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can delete own avatar" ON storage.objects;

CREATE POLICY "Drivers can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      name = 'driver-avatars/' || (auth.uid())::text
      OR name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
    )
  );

CREATE POLICY "Drivers can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      name = 'driver-avatars/' || (auth.uid())::text
      OR name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      name = 'driver-avatars/' || (auth.uid())::text
      OR name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
    )
  );

CREATE POLICY "Drivers can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      name = 'driver-avatars/' || (auth.uid())::text
      OR name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
    )
  );
