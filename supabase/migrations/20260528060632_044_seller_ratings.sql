/*
  # Seller Ratings

  1. New Tables
     - `seller_ratings`
       - `id` (uuid, primary key)
       - `seller_id` (uuid → seller_profiles.id)
       - `user_id` (uuid → auth.users.id)
       - `rating` (integer 1–5)
       - `comment` (text, optional)
       - `created_at` (timestamptz)
       - `updated_at` (timestamptz)
       - UNIQUE (seller_id, user_id) — one rating per user per seller

  2. Trigger
     - After insert/update/delete on seller_ratings, recalculate
       seller_profiles.rating_average and seller_profiles.rating_count

  3. Security
     - RLS enabled
     - Authenticated users can insert/update their own ratings
     - Anyone can read ratings
     - Users cannot delete others' ratings
*/

CREATE TABLE IF NOT EXISTS seller_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (seller_id, user_id)
);

ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seller ratings"
  ON seller_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own rating"
  ON seller_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rating"
  ON seller_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rating"
  ON seller_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger function: recompute seller rating stats
CREATE OR REPLACE FUNCTION sync_seller_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  v_seller_id := COALESCE(NEW.seller_id, OLD.seller_id);

  UPDATE seller_profiles
  SET
    rating_average = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM seller_ratings
      WHERE seller_id = v_seller_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM seller_ratings
      WHERE seller_id = v_seller_id
    )
  WHERE id = v_seller_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_seller_rating ON seller_ratings;
CREATE TRIGGER trg_sync_seller_rating
  AFTER INSERT OR UPDATE OR DELETE ON seller_ratings
  FOR EACH ROW EXECUTE FUNCTION sync_seller_rating();

NOTIFY pgrst, 'reload schema';
