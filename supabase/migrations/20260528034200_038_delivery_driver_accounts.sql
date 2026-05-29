/*
  # Delivery Driver Accounts System

  ## Overview
  Adds a first-class delivery driver account system with:
  - Delivery areas (Melbourne, Sydney, Brisbane, Perth, Adelaide)
  - Driver accounts linked to Supabase Auth, admin-created
  - Mandatory password change on first login (blocks dashboard until done)
  - Ban/remove capability for admins
  - Orders automatically routed to drivers by delivery area match on suburb

  ## New Tables

  ### delivery_areas
  - id, name, slug, suburbs (text[]), is_active, created_at

  ### delivery_driver_accounts
  - id, user_id (FK auth.users), first_name, last_name, email, phone
  - area_id (FK delivery_areas), status (active/banned/inactive)
  - must_change_password (boolean - blocks dashboard on first login)
  - vehicle_type, vehicle_rego, notes, created_by, banned_at, banned_reason
  - created_at, updated_at

  ## Security
  - RLS on all tables
  - Drivers read/update own record only
  - Admin role (via roles table join) manages everything
  - delivery_areas publicly readable
*/

-- ─── delivery_areas ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_areas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  suburbs    text[] DEFAULT '{}',
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read delivery areas"
  ON delivery_areas FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert delivery areas"
  ON delivery_areas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update delivery areas"
  ON delivery_areas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ─── delivery_driver_accounts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_driver_accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name           text NOT NULL DEFAULT '',
  last_name            text NOT NULL DEFAULT '',
  email                text NOT NULL,
  phone                text DEFAULT '',
  area_id              uuid REFERENCES delivery_areas(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'banned', 'inactive')),
  must_change_password boolean NOT NULL DEFAULT true,
  vehicle_type         text DEFAULT 'car'
                         CHECK (vehicle_type IN ('car', 'van', 'truck', 'motorbike')),
  vehicle_rego         text DEFAULT '',
  notes                text DEFAULT '',
  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_at            timestamptz,
  banned_reason        text DEFAULT '',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE delivery_driver_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can read own account"
  ON delivery_driver_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own account"
  ON delivery_driver_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all driver accounts"
  ON delivery_driver_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can insert driver accounts"
  ON delivery_driver_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update driver accounts"
  ON delivery_driver_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can delete driver accounts"
  ON delivery_driver_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_delivery_driver_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_driver_updated_at ON delivery_driver_accounts;
CREATE TRIGGER trg_delivery_driver_updated_at
  BEFORE UPDATE ON delivery_driver_accounts
  FOR EACH ROW EXECUTE FUNCTION update_delivery_driver_updated_at();

-- ─── Seed delivery areas ──────────────────────────────────────────────────────
INSERT INTO delivery_areas (name, slug, suburbs, is_active) VALUES
  ('Melbourne', 'melbourne', ARRAY['Melbourne CBD','Southbank','Docklands','Fitzroy','Collingwood','Richmond','St Kilda','South Yarra','Prahran','Windsor','Brunswick','Coburg','Preston','Reservoir','Thornbury','Northcote','Carlton','Parkville','Footscray','Sunshine','Werribee','Dandenong','Clayton','Springvale','Frankston','Box Hill','Camberwell','Hawthorn','Kew','Balwyn'], true),
  ('Sydney', 'sydney', ARRAY['Sydney CBD','Parramatta','Liverpool','Blacktown','Penrith','Campbelltown','Bankstown','Auburn','Burwood','Strathfield','Hornsby','Chatswood','North Sydney','Manly','Bondi','Newtown','Surry Hills','Redfern','Pyrmont','Ultimo'], true),
  ('Brisbane', 'brisbane', ARRAY['Brisbane CBD','South Brisbane','West End','Fortitude Valley','New Farm','Kangaroo Point','Woolloongabba','Annerley','Sunnybank','Runcorn','Logan','Ipswich','Redcliffe','Strathpine','Carindale','Mount Gravatt','Indooroopilly','Toowong'], true),
  ('Perth', 'perth', ARRAY['Perth CBD','Fremantle','Joondalup','Rockingham','Mandurah','Midland','Armadale','Cannington','Canning Vale','Bayswater','Osborne Park','Balcatta','Stirling','Karrinyup','Scarborough','Northbridge','Leederville','Subiaco'], true),
  ('Adelaide', 'adelaide', ARRAY['Adelaide CBD','Glenelg','Marion','Elizabeth','Salisbury','Tea Tree Gully','Modbury','Norwood','Prospect','Port Adelaide','Morphett Vale','Noarlunga','Christies Beach'], true)
ON CONFLICT (slug) DO NOTHING;

-- ─── Helper RPC: get driver account by user_id ────────────────────────────────
CREATE OR REPLACE FUNCTION get_driver_account(p_user_id uuid)
RETURNS TABLE (
  id                   uuid,
  user_id              uuid,
  first_name           text,
  last_name            text,
  email                text,
  phone                text,
  area_id              uuid,
  area_name            text,
  area_slug            text,
  status               text,
  must_change_password boolean,
  vehicle_type         text,
  vehicle_rego         text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.user_id, d.first_name, d.last_name, d.email, d.phone,
    d.area_id, a.name AS area_name, a.slug AS area_slug,
    d.status, d.must_change_password, d.vehicle_type, d.vehicle_rego
  FROM delivery_driver_accounts d
  LEFT JOIN delivery_areas a ON a.id = d.area_id
  WHERE d.user_id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_driver_account(uuid) TO authenticated;

-- ─── RPC: get orders for a delivery area ─────────────────────────────────────
-- Matches orders whose delivery_address->>'suburb' is in the area's suburbs array.
-- Returns orders that are ready for pickup/delivery (not delivered/cancelled).
CREATE OR REPLACE FUNCTION get_orders_for_area(p_area_id uuid)
RETURNS TABLE (
  id                uuid,
  order_number      text,
  status            text,
  total_amount      numeric,
  delivery_address  jsonb,
  driver_id         uuid,
  created_at        timestamptz,
  contact_email     text,
  contact_phone     text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    o.id, o.order_number, o.status, o.total_amount,
    o.delivery_address, o.driver_id, o.created_at,
    o.contact_email, o.contact_phone
  FROM orders o
  WHERE
    o.status NOT IN ('draft','cancelled','delivered','refund_processed')
    AND o.payment_status IN ('paid','authorised')
    AND (
      -- suburb match (case-insensitive)
      EXISTS (
        SELECT 1 FROM delivery_areas da
        WHERE da.id = p_area_id
          AND lower(o.delivery_address->>'suburb') = ANY(
            SELECT lower(s) FROM unnest(da.suburbs) AS s
          )
      )
      -- or city/state match when no suburb field
      OR EXISTS (
        SELECT 1 FROM delivery_areas da
        WHERE da.id = p_area_id
          AND lower(o.delivery_address->>'city') = lower(da.name)
      )
    )
  ORDER BY o.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_orders_for_area(uuid) TO authenticated;
