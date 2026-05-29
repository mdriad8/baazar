import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { product_id } = await req.json();

  const { data: sellerUser } = await supabase
    .from('seller_users')
    .select('seller_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sellerUser) return NextResponse.json({ error: 'Not a seller' }, { status: 403 });

  // Verify product belongs to seller
  const { data: product } = await supabase
    .from('products')
    .select('id, status')
    .eq('id', product_id)
    .eq('seller_id', sellerUser.seller_id)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  if (!['draft', 'rejected'].includes(product.status)) {
    return NextResponse.json({ error: 'Product cannot be submitted in its current status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('products')
    .update({ status: 'pending_admin_approval', rejection_reason: '' })
    .eq('id', product_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, message: 'Product submitted for admin approval' });
}
