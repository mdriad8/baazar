/*
  # Fix get_orders_for_area to include driver's own delivered/failed orders

  Previously the function excluded 'delivered' and 'cancelled' statuses entirely,
  so drivers could never see their completed deliveries and the "Delivered" counter
  always showed 0.

  Drop and recreate with the additional delivery_failure_note column and the
  extra OR clause that always returns orders assigned to the calling driver.
*/

DROP FUNCTION IF EXISTS public.get_orders_for_area(uuid);

CREATE FUNCTION public.get_orders_for_area(p_area_id uuid)
RETURNS TABLE(
  id uuid,
  order_number text,
  status text,
  total_amount numeric,
  delivery_address jsonb,
  driver_id uuid,
  created_at timestamptz,
  contact_email text,
  contact_phone text,
  customer_name text,
  driver_name text,
  driver_phone text,
  delivery_failure_note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  o.id,
  o.order_number,
  o.status,
  o.total_amount,
  o.delivery_address,
  o.driver_id,
  o.created_at,
  o.contact_email,
  o.contact_phone,
  COALESCE(
    NULLIF(TRIM(COALESCE(cp.first_name,'') || ' ' || COALESCE(cp.last_name,'')), ''),
    o.contact_email,
    'Customer'
  ) AS customer_name,
  CASE WHEN o.driver_id IS NOT NULL THEN
    COALESCE(NULLIF(TRIM(COALESCE(dda.first_name,'') || ' ' || COALESCE(dda.last_name,'')), ''), dda.email)
  END AS driver_name,
  CASE WHEN o.driver_id IS NOT NULL THEN dda.phone END AS driver_phone,
  o.delivery_failure_note
FROM orders o
LEFT JOIN customer_profiles cp ON cp.user_id = o.user_id
LEFT JOIN delivery_driver_accounts dda ON dda.user_id = o.driver_id
WHERE
  -- Orders available in this area (not terminal)
  (
    o.status NOT IN ('draft', 'cancelled', 'delivered', 'failed_delivery', 'refund_processed')
    AND o.payment_status IN ('paid', 'authorised', 'pending')
    AND (
      EXISTS (
        SELECT 1 FROM delivery_areas da
        WHERE da.id = p_area_id
        AND lower(o.delivery_address->>'suburb') = ANY(
          SELECT lower(s) FROM unnest(da.suburbs) AS s
        )
      )
      OR EXISTS (
        SELECT 1 FROM delivery_areas da
        WHERE da.id = p_area_id
        AND (
          (lower(o.delivery_address->>'state') = 'vic' AND lower(da.name) = 'melbourne')
          OR (lower(o.delivery_address->>'state') = 'nsw' AND lower(da.name) = 'sydney')
          OR (lower(o.delivery_address->>'state') = 'qld' AND lower(da.name) = 'brisbane')
          OR (lower(o.delivery_address->>'state') = 'wa'  AND lower(da.name) = 'perth')
          OR (lower(o.delivery_address->>'state') = 'sa'  AND lower(da.name) = 'adelaide')
          OR (lower(o.delivery_address->>'state') = 'act' AND lower(da.name) = 'canberra')
          OR (lower(o.delivery_address->>'state') = 'tas' AND lower(da.name) = 'hobart')
          OR (lower(o.delivery_address->>'state') = 'nt'  AND lower(da.name) = 'darwin')
        )
      )
    )
  )
  -- OR: any order this driver is/was assigned to (shows their full history)
  OR o.driver_id = auth.uid()
ORDER BY o.created_at ASC;
$$;
