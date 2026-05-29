/*
  # Add ad creative fields to campaigns table

  Adds fields needed to display banner ads on the storefront:
  - banner_image_url: the ad creative image
  - headline: short ad headline text
  - tagline: optional subtitle/tagline
  - cta_text: call-to-action button text
  - cta_url: where the ad links to
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'banner_image_url') THEN
    ALTER TABLE campaigns ADD COLUMN banner_image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'headline') THEN
    ALTER TABLE campaigns ADD COLUMN headline text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'tagline') THEN
    ALTER TABLE campaigns ADD COLUMN tagline text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'cta_text') THEN
    ALTER TABLE campaigns ADD COLUMN cta_text text DEFAULT 'Shop Now';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'cta_url') THEN
    ALTER TABLE campaigns ADD COLUMN cta_url text;
  END IF;
END $$;
