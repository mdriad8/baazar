import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, order_amount } = await req.json();

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (!promo) return NextResponse.json({ valid: false, message: 'Invalid promo code' });

  const now = new Date();
  if (new Date(promo.start_date) > now) return NextResponse.json({ valid: false, message: 'Promo code not yet active' });
  if (promo.end_date && new Date(promo.end_date) < now) return NextResponse.json({ valid: false, message: 'Promo code expired' });
  if (promo.minimum_order_amount > 0 && order_amount < promo.minimum_order_amount) {
    return NextResponse.json({ valid: false, message: `Minimum order $${promo.minimum_order_amount} required` });
  }

  // Check usage limits
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return NextResponse.json({ valid: false, message: 'Promo code usage limit reached' });
  }

  // Check per-customer limit
  const { count } = await supabase
    .from('promo_code_usage')
    .select('id', { count: 'exact' })
    .eq('promo_code_id', promo.id)
    .eq('user_id', user.id);

  if ((count ?? 0) >= promo.usage_per_customer) {
    return NextResponse.json({ valid: false, message: 'You have already used this promo code' });
  }

  // Calculate discount
  let discount = 0;
  if (promo.type === 'percentage') {
    discount = order_amount * (promo.discount_value / 100);
    if (promo.max_discount_amount) discount = Math.min(discount, promo.max_discount_amount);
  } else if (promo.type === 'fixed_amount') {
    discount = Math.min(promo.discount_value, order_amount);
  } else if (promo.type === 'free_delivery') {
    discount = 0; // Handled client-side
  }

  return NextResponse.json({
    valid: true,
    discount,
    type: promo.type,
    discount_value: promo.discount_value,
    message: `Promo applied! You save $${discount.toFixed(2)}`,
  });
}
