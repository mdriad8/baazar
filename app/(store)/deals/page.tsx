export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { createServiceClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/products/ProductGrid';
import { Tag, ChevronRight, Flame, Clock, Percent } from 'lucide-react';

interface SearchParams {
  sort?: string;
  category?: string;
  min_discount?: string;
}

async function getDealsData(params: SearchParams) {
  const supabase = createServiceClient();

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, price, sale_price, stock_status, is_halal, storage_type,
      unit_type, rating_average, rating_count,
      product_images(image_url, is_primary),
      seller_profiles(display_name),
      categories(name, slug)
    `)
    .eq('status', 'published')
    .not('sale_price', 'is', null);

  if (params.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', params.category)
      .maybeSingle();
    if (cat) query = query.eq('category_id', cat.id);
  }

  switch (params.sort) {
    case 'discount': query = query.order('sale_price', { ascending: true }); break;
    case 'price_asc': query = query.order('sale_price', { ascending: true }); break;
    case 'price_desc': query = query.order('sale_price', { ascending: false }); break;
    case 'rating': query = query.order('rating_average', { ascending: false }); break;
    default: query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  }

  const { data } = await query.limit(48);

  const products = (data ?? []).map((p: Record<string, unknown>) => {
    const images = (p.product_images as Array<{ image_url: string; is_primary: boolean }>) ?? [];
    const primary = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
    const seller = p.seller_profiles as { display_name: string } | null;
    const price = p.price as number;
    const salePrice = p.sale_price as number;
    const discount = Math.round((1 - salePrice / price) * 100);
    return {
      id: p.id as string,
      name: p.name as string,
      slug: p.slug as string,
      price,
      sale_price: salePrice,
      stock_status: p.stock_status as string,
      is_halal: p.is_halal as boolean,
      storage_type: p.storage_type as string,
      unit_type: p.unit_type as string,
      rating_average: p.rating_average as number,
      rating_count: p.rating_count as number,
      primary_image: primary,
      seller_name: seller?.display_name ?? 'Baazar',
      discount,
    };
  });

  // Split into buckets
  const bigDeals = products.filter(p => p.discount >= 30).sort((a, b) => b.discount - a.discount);
  const allDeals = products;

  // Fetch active promo codes for display
  const { data: promos } = await supabase
    .from('promo_codes')
    .select('code, discount_type, discount_value, description, min_order_amount, expires_at')
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .limit(4);

  return { allDeals, bigDeals, promos: promos ?? [] };
}

export default async function DealsPage({ searchParams }: { searchParams: SearchParams }) {
  const { allDeals, bigDeals, promos } = await getDealsData(searchParams);

  const SORT_OPTIONS = [
    { value: 'default', label: 'Best Match' },
    { value: 'discount', label: 'Biggest Discount' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
  ];

  const currentSort = searchParams.sort ?? 'default';

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 text-white">
        <div className="container-page py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full mb-3">
                <Flame className="w-3.5 h-3.5 text-orange-200" />
                <span className="text-xs font-semibold text-white">Limited Time Deals</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight">
                Deals &amp; Special Offers
              </h1>
              <p className="text-orange-100 text-base md:text-lg max-w-md leading-relaxed">
                Save big on halal meat, groceries, spices and more. Fresh deals added daily.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
                  <Tag className="w-4 h-4 text-orange-200" />
                  <span className="text-sm font-semibold">{allDeals.length} deals live</span>
                </div>
                {bigDeals.length > 0 && (
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
                    <Percent className="w-4 h-4 text-orange-200" />
                    <span className="text-sm font-semibold">{bigDeals.length} items 30%+ off</span>
                  </div>
                )}
              </div>
            </div>
            {/* Deal images collage */}
            <div className="hidden md:grid grid-cols-2 gap-2 flex-shrink-0 w-52">
              {[
                'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
                'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg',
                'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
                'https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg',
              ].map((src, i) => (
                <div key={i} className="relative h-24 rounded-xl overflow-hidden ring-2 ring-white/30">
                  <Image src={src} alt="Deal" fill className="object-cover" sizes="104px" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        {/* Promo code strip */}
        {promos.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 className="font-bold text-gray-900">Active Promo Codes</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {promos.map((promo: Record<string, unknown>) => {
                const discountVal = promo.discount_value as number;
                const discountType = promo.discount_type as string;
                const code = promo.code as string;
                const desc = promo.description as string | null;
                const minOrder = promo.min_order_amount as number | null;
                const expiresAt = promo.expires_at as string | null;
                const saving = discountType === 'percentage' ? `${discountVal}% off` : `$${discountVal} off`;

                return (
                  <div key={code} className="bg-white border-2 border-dashed border-orange-300 rounded-2xl p-4 relative overflow-hidden group hover:border-orange-400 transition-colors">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full" />
                    <div className="relative">
                      <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-bold mb-2">
                        <Percent className="w-3 h-3" /> {saving}
                      </div>
                      <p className="font-mono font-bold text-lg text-gray-900 tracking-widest">{code}</p>
                      {desc && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{desc}</p>}
                      {minOrder && (
                        <p className="text-[10px] text-gray-400 mt-1">Min. order: ${minOrder}</p>
                      )}
                      {expiresAt && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-orange-600">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Big Deals section */}
        {bigDeals.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                  <Flame className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Biggest Discounts</h2>
                  <p className="text-xs text-gray-500">30% or more off regular price</p>
                </div>
              </div>
              <Link href="/deals?sort=discount" className="text-sm text-[hsl(var(--primary))] hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ProductGrid products={bigDeals.slice(0, 8)} columns={4} />
          </section>
        )}

        {/* All Deals */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">All Deals</h2>
              <p className="text-sm text-gray-500">{allDeals.length} products on sale</p>
            </div>
            {/* Sort links */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500 whitespace-nowrap">Sort:</span>
              {SORT_OPTIONS.map(o => (
                <Link
                  key={o.value}
                  href={o.value === 'default' ? '/deals' : `/deals?sort=${o.value}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    currentSort === o.value
                      ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>

          {allDeals.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-orange-300" />
              </div>
              <h3 className="font-semibold text-gray-700 text-lg mb-2">No deals right now</h3>
              <p className="text-gray-400 text-sm mb-5">Check back soon — we add new deals daily.</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold rounded-xl text-sm hover:bg-[hsl(142,74%,24%)] transition-all"
              >
                Browse all products <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <ProductGrid products={allDeals} columns={4} />
          )}
        </section>

        {/* CTA */}
        <div className="mt-10 bg-gradient-to-r from-[hsl(142,72%,29%)] to-[hsl(142,65%,22%)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Never miss a deal</h3>
            <p className="text-emerald-100 text-sm">Sign up to get notified when new deals drop.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/auth/register"
              className="px-5 py-2.5 bg-white text-[hsl(var(--primary))] font-bold rounded-xl text-sm hover:bg-gray-50 transition-all shadow"
            >
              Create Account
            </Link>
            <Link
              href="/products"
              className="px-5 py-2.5 border border-white/30 text-white font-semibold rounded-xl text-sm hover:border-white/60 transition-all"
            >
              Browse All
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
