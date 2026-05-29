import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sellerUser } = await supabase
    .from('seller_users')
    .select('seller_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sellerUser) return NextResponse.json({ error: 'Not a seller' }, { status: 403 });

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, status, stock_quantity, view_count, purchase_count, created_at, product_images(image_url, is_primary)')
    .eq('seller_id', sellerUser.seller_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sellerUser } = await supabase
    .from('seller_users')
    .select('seller_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sellerUser) return NextResponse.json({ error: 'Not a seller' }, { status: 403 });

  const body = await req.json();
  const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...body,
      seller_id: sellerUser.seller_id,
      slug,
      status: 'draft',
    })
    .select('id, slug')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
