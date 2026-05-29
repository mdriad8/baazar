/*
  # Seed a default seller account

  Creates a complete seller account that can log into the seller dashboard.

  1. Auth user: seller@baazar.com.au / Seller@Baazar2024!
  2. customer_profiles row linked to the auth user
  3. seller_profiles row for the business
  4. seller_users row linking the user to the seller profile with 'owner' role
*/

DO $$
DECLARE
  v_user_id uuid;
  v_seller_id uuid;
BEGIN

  -- Only create auth user if it doesn't already exist
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'seller@baazar.com.au';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      role,
      aud,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'seller@baazar.com.au',
      crypt('Seller@Baazar2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo Seller"}',
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  END IF;

  -- customer_profiles (base profile for all users)
  INSERT INTO customer_profiles (user_id, first_name, last_name, email_verified)
  VALUES (v_user_id, 'Demo', 'Seller', true)
  ON CONFLICT (user_id) DO NOTHING;

  -- seller_profiles
  SELECT id INTO v_seller_id FROM seller_profiles WHERE slug = 'demo-seller';

  IF v_seller_id IS NULL THEN
    v_seller_id := gen_random_uuid();
    INSERT INTO seller_profiles (
      id,
      slug,
      business_name,
      display_name,
      description,
      contact_email,
      business_type,
      status,
      country,
      commission_rate,
      created_by
    ) VALUES (
      v_seller_id,
      'demo-seller',
      'Demo Seller Store',
      'Demo Seller',
      'A demo seller account for testing the Baazar seller dashboard.',
      'seller@baazar.com.au',
      'sole_trader',
      'active',
      'Australia',
      10.00,
      v_user_id
    );
  END IF;

  -- Link user to seller profile
  INSERT INTO seller_users (user_id, seller_id, role, is_active)
  VALUES (v_user_id, v_seller_id, 'owner', true)
  ON CONFLICT (user_id, seller_id) DO NOTHING;

END $$;
