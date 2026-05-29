import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

    // In production: verify signature with Stripe SDK
    // const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
    const supabase = createServiceClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = (session.metadata as Record<string, string>)?.order_id;

        if (orderId) {
          await supabase.from('orders').update({
            payment_status: 'paid',
            status: 'payment_confirmed',
          }).eq('id', orderId);

          await supabase.from('order_tracking_events').insert({
            order_id: orderId,
            status: 'payment_confirmed',
            message: 'Payment confirmed via Stripe',
            is_customer_visible: true,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        await supabase.from('payments').update({
          status: 'failed',
        }).eq('gateway_payment_intent_id', intent.id as string);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
