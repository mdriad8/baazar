import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id, product_id, quantity, unit_type, saved_for_later,
      products(id, name, slug, price, sale_price, stock_status,
        product_images(image_url, is_primary))
    `)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { product_id, quantity = 1, unit_type = 'each' } = body;

  const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      user_id: user.id,
      product_id,
      quantity,
      unit_type,
      sku_id: null,
    }, { onConflict: 'user_id,product_id,sku_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('id');

  if (itemId) {
    await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', user.id);
  } else {
    await supabase.from('cart_items').delete().eq('user_id', user.id);
  }

  return NextResponse.json({ success: true });
}
