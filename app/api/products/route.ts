import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const halal = searchParams.get('halal');
  const featured = searchParams.get('featured');
  const trending = searchParams.get('trending');
  const sort = searchParams.get('sort') ?? 'newest';
  const page = parseInt(searchParams.get('page') ?? '1');
  const perPage = parseInt(searchParams.get('per_page') ?? '24');

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type,
      rating_average, rating_count, is_featured, is_trending,
      product_images(image_url, is_primary),
      seller_profiles(display_name, slug),
      categories(name, slug)
    `, { count: 'exact' })
    .eq('status', 'published');

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  if (halal === 'true') query = query.eq('is_halal', true);
  if (featured === 'true') query = query.eq('is_featured', true);
  if (trending === 'true') query = query.eq('is_trending', true);
  if (category) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).maybeSingle();
    if (cat) query = query.eq('category_id', cat.id);
  }

  switch (sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'rating': query = query.order('rating_average', { ascending: false }); break;
    case 'popular': query = query.order('purchase_count', { ascending: false }); break;
    default: query = query.order('created_at', { ascending: false });
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    meta: { page, per_page: perPage, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / perPage) },
  });
}
