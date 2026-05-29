import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function isAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
    .maybeSingle();

  const roles = data?.roles as { name: string } | null;
  return roles?.name === 'admin';
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, price, status, created_at,
      seller_profiles(display_name, contact_email),
      categories(name),
      product_images(image_url, is_primary)
    `)
    .eq('status', 'pending_admin_approval')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { product_id, action, note } = body;

  if (!['approve', 'reject', 'request_changes'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  let status: string;
  switch (action) {
    case 'approve': status = 'published'; break;
    case 'reject': status = 'rejected'; break;
    default: status = 'pending_admin_approval';
  }

  const updateData: Record<string, unknown> = {
    status,
    admin_note: note ?? '',
  };

  if (action === 'approve') {
    updateData.approved_by = user.id;
    updateData.approved_at = new Date().toISOString();
    updateData.rejection_reason = '';
  } else if (action === 'reject') {
    updateData.rejection_reason = note ?? '';
  }

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', product_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, action, status });
}
