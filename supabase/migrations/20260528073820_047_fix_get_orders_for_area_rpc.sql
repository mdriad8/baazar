/*
  # Fix get_orders_for_area RPC

  ## Problems
  1. The RPC only returns orders with payment_status IN ('paid','authorised').
     Since there is no live payment gateway yet, all orders have payment_status = 'pending'
     and are never shown to drivers.
  2. Suburb matching is too strict — many valid VIC suburbs (e.g. Caroline Springs)
     are not in the Melbourne suburbs list, so orders are silently dropped.
  3. The city fallback checks delivery_address->>'city' which is never populated
     by the checkout form (it uses suburb/state fields instead).

  ## Fix
  1. Include 'pending' payment_status so drivers see all placed orders.
  2. Add a state-based fallback: map AU state abbreviations to delivery area names
     so orders with state=VIC go to Melbourne, NSW->Sydney, QLD->Brisbane, etc.
  3. Keep existing suburb matching as the primary/preferred match.
*/

CREATE OR REPLACE FUNCTION get_orders_for_area(p_area_id uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  status text,
  total_amount numeric,
  delivery_address jsonb,
  driver_id uuid,
  created_at timestamptz,
  contact_email text,
  contact_phone text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
SELECT
  o.id, o.order_number, o.status, o.total_amount,
  o.delivery_address, o.driver_id, o.created_at,
  o.contact_email, o.contact_phone
FROM orders o
WHERE
  o.status NOT IN ('draft', 'cancelled', 'delivered', 'refund_processed')
  AND o.payment_status IN ('paid', 'authorised', 'pending')
  AND (
    -- 1. Exact suburb match (case-insensitive) against area's suburbs array
    EXISTS (
      SELECT 1 FROM delivery_areas da
      WHERE da.id = p_area_id
        AND lower(o.delivery_address->>'suburb') = ANY(
          SELECT lower(s) FROM unnest(da.suburbs) AS s
        )
    )
    -- 2. State-based fallback: map AU state codes to delivery area names
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
ORDER BY o.created_at ASC;
$func$;
