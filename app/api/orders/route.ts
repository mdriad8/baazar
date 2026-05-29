import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GST_RATE, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/lib/constants';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, status, payment_status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { delivery_address, order_note, payment_method, payment_gateway, delivery_slot_date, delivery_slot_time, promo_code } = body;

  // Get cart items — include seller_id so order_lines are correctly attributed
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, products(id, name, price, sale_price, seller_id)')
    .eq('user_id', user.id)
    .eq('saved_for_later', false);

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const subtotal = cartItems.reduce((sum: number, item: Record<string, unknown>) => {
    const p = item.products as Record<string, unknown>;
    const price = (p?.sale_price as number | null) ?? (p?.price as number ?? 0);
    return sum + price * (item.quantity as number);
  }, 0);

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const gstAmount = subtotal * GST_RATE;
  const total = subtotal + deliveryFee + gstAmount;

  const orderNumber = `BZ${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      delivery_address,
      subtotal,
      delivery_fee: deliveryFee,
      gst_amount: gstAmount,
      total_amount: total,
      order_note,
      payment_method,
      payment_gateway,
      delivery_slot_date,
      delivery_slot_time,
      promo_code: promo_code ?? '',
      status: 'placed',
      payment_status: 'pending',
    })
    .select('id, order_number')
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Create order lines
  const lines = cartItems.map((item: Record<string, unknown>) => {
    const p = item.products as Record<string, unknown>;
    const price = (p?.sale_price as number | null) ?? (p?.price as number ?? 0);
    const lineTotal = price * (item.quantity as number);
    return {
      order_id: order.id,
      product_id: item.product_id,
      seller_id: (p?.seller_id as string | null) ?? null,
      product_name: p?.name as string ?? '',
      unit_price: price,
      quantity: item.quantity,
      unit_type: item.unit_type,
      line_total: lineTotal,
      gst_rate: GST_RATE * 100,
      gst_amount: lineTotal * GST_RATE,
    };
  });

  await supabase.from('order_lines').insert(lines);

  // Initial tracking
  await supabase.from('order_tracking_events').insert({
    order_id: order.id,
    status: 'placed',
    message: 'Order placed successfully',
    updated_by: user.id,
    is_customer_visible: true,
  });

  // Clear cart
  await supabase.from('cart_items').delete().eq('user_id', user.id).eq('saved_for_later', false);

  return NextResponse.json({ data: order });
}
