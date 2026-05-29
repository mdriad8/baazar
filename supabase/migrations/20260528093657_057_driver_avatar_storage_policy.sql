/*
  # Add storage policies for driver avatar uploads

  The driver dashboard uploads avatars to path `driver-avatars/{user_id}.{ext}`.
  The existing INSERT policy only allows paths under `{auth.uid()}/...` which
  doesn't match the driver-avatars prefix.

  This migration adds explicit INSERT, UPDATE, and DELETE policies for the
  driver-avatars folder, scoped to the authenticated driver's own user_id.
*/

-- Allow drivers to upload their own avatar to driver-avatars/{their-uid}.*
CREATE POLICY "Drivers can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
  );

CREATE POLICY "Drivers can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
  );

CREATE POLICY "Drivers can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'driver-avatars/' || (auth.uid())::text || '.%'
  );
