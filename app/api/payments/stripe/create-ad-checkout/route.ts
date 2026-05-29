import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { campaign_id } = await req.json();
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

  // Verify the campaign belongs to this seller
  const { data: sellerUser } = await supabase
    .from('seller_users')
    .select('seller_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sellerUser) return NextResponse.json({ error: 'No seller account' }, { status: 403 });

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, total_budget, payment_status, seller_id')
    .eq('id', campaign_id)
    .eq('seller_id', sellerUser.seller_id)
    .maybeSingle();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const successUrl = `${siteUrl}/seller-dashboard/ads/payment-success?campaign_id=${campaign_id}`;
  const cancelUrl = `${siteUrl}/seller-dashboard/ads/payment-cancel?campaign_id=${campaign_id}`;

  if (!process.env.STRIPE_SECRET_KEY) {
    // Demo mode: simulate a successful payment by marking it paid immediately
    const service = createServiceClient();
    await service.from('campaigns').update({
      payment_status: 'paid',
      amount_paid: campaign.total_budget,
      status: 'draft',
      admin_approval_status: 'pending',
    }).eq('id', campaign_id);

    return NextResponse.json({
      demo: true,
      redirect_url: successUrl,
      message: 'Demo mode: payment simulated. Configure STRIPE_SECRET_KEY for real payments.',
    });
  }

  // Real Stripe checkout — only reached when STRIPE_SECRET_KEY is set
  // Use eval to prevent webpack from bundling the stripe package at build time
  // eslint-disable-next-line no-new-func
  const stripeModule = await new Function('return import("stripe")')();
  const stripeClient = new stripeModule.default(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: campaign.name ?? 'Ad Campaign',
          description: 'Baazar ad campaign — total budget',
        },
        unit_amount: Math.round(campaign.total_budget * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { campaign_id, user_id: user.id },
  });

  // Record a pending payment entry
  await supabase.from('payments').insert({
    user_id: user.id,
    amount: campaign.total_budget,
    currency: 'AUD',
    payment_gateway: 'stripe',
    status: 'pending',
    gateway_payment_intent_id: session.payment_intent as string | null,
  });

  return NextResponse.json({ redirect_url: session.url });
}
