import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id, name, ad_type, placement, start_date, end_date, total_budget,
      amount_paid, payment_status, admin_approval_status, created_at,
      seller_profiles(display_name),
      products(name, slug, price, product_images(image_url, is_primary))
    `)
    .eq('admin_approval_status', 'pending')
    .eq('payment_status', 'paid')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { campaign_id, action, note, priority } = body;

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    admin_approval_status: action === 'approve' ? 'approved' : 'rejected',
    admin_note: note ?? '',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  };

  if (action === 'approve') {
    updateData.status = 'active';
    if (priority !== undefined) updateData.priority = priority;
  } else {
    updateData.status = 'rejected';
  }

  const { error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', campaign_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
