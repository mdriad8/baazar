/*
  # Product Reviews – RLS admin policies + user delete

  1. New Policies
    - Users can delete own reviews
    - Admins can read ALL reviews (including unapproved)
    - Admins can update any review (approve/unapprove)
    - Admins can delete any review
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_reviews' AND policyname = 'Users can delete own reviews') THEN
    EXECUTE 'CREATE POLICY "Users can delete own reviews" ON product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_reviews' AND policyname = 'Admins can read all reviews') THEN
    EXECUTE 'CREATE POLICY "Admins can read all reviews" ON product_reviews FOR SELECT TO authenticated USING (check_is_admin(auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_reviews' AND policyname = 'Admins can update any review') THEN
    EXECUTE 'CREATE POLICY "Admins can update any review" ON product_reviews FOR UPDATE TO authenticated USING (check_is_admin(auth.uid())) WITH CHECK (check_is_admin(auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_reviews' AND policyname = 'Admins can delete any review') THEN
    EXECUTE 'CREATE POLICY "Admins can delete any review" ON product_reviews FOR DELETE TO authenticated USING (check_is_admin(auth.uid()))';
  END IF;
END $$;
