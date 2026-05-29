/*
  # Product seller-edit workflow

  1. Changes
    - Add `pending_edit` JSONB column to `products` — stores the seller's proposed
      changes while the live published data stays intact
    - Add `pending_edit_at` timestamp so admins can see when the edit was submitted
    - Add `pending_edit_rejection_reason` text for admin to communicate reason if denied

  2. Workflow
    - Seller edits a published product → data saved to `pending_edit`, status stays
      `published`, a separate flag `has_pending_edit` is set to true
    - Admin sees the diff in Product Approvals and can Approve (merges pending_edit
      into live columns, clears pending_edit) or Reject (clears pending_edit, notifies
      seller via rejection_reason)
    - Admin can always directly edit a product — no approval needed

  3. Notes
    - Existing products are unaffected (pending_edit defaults to NULL)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'pending_edit'
  ) THEN
    ALTER TABLE products ADD COLUMN pending_edit jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'pending_edit_at'
  ) THEN
    ALTER TABLE products ADD COLUMN pending_edit_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'pending_edit_rejection_reason'
  ) THEN
    ALTER TABLE products ADD COLUMN pending_edit_rejection_reason text DEFAULT NULL;
  END IF;
END $$;
