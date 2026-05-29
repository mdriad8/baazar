import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment variables.',
      demo: true,
    }, { status: 503 });
  }

  const body = await req.json();
  const { order_id, amount, currency = 'AUD' } = body;

  const { data: order } = await supabase
    .from('orders')
    .select('order_number')
    .eq('id', order_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Record pending payment
  await supabase.from('payments').insert({
    user_id: user.id,
    order_id,
    amount,
    currency,
    payment_gateway: 'stripe',
    status: 'pending',
  });

  // In production: create real Stripe checkout session
  // For now return a demo response
  return NextResponse.json({
    demo: true,
    message: 'Stripe checkout ready. Configure STRIPE_SECRET_KEY to process real payments.',
    order_number: order.order_number,
  });
}
