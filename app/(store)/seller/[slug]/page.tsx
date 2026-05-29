export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import ProductCard from '@/components/products/ProductCard';
import { Star, MapPin, Package, ChevronRight, ShieldCheck, Store } from 'lucide-react';
import SellerRatingWidget from './SellerRatingWidget';

interface Props {
  params: { slug: string };
  searchParams: { category?: string; sort?: string };
}

async function getSeller(slug: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('seller_profiles')
    .select('id, slug, display_name, business_name, description, logo_url, banner_url, suburb, state, rating_average, rating_count, total_products, created_at')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  return data;
}

async function getSellerProducts(sellerId: string, sort?: string) {
  const supabase = createServiceClient();

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, price, sale_price, stock_status, is_halal, storage_type,
      unit_type, rating_average, rating_count,
      product_images(image_url, is_primary),
      categories(id, name, slug)
    `)
    .eq('seller_id', sellerId)
    .eq('status', 'published');

  switch (sort) {
    case 'price_asc':  query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'rating':     query = query.order('rating_average', { ascending: false }); break;
    case 'popular':    query = query.order('purchase_count', { ascending: false }); break;
    default:           query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  }

  const { data } = await query.limit(96);
  return data ?? [];
}

function mapProduct(p: Record<string, unknown>) {
  const images = (p.product_images as Array<{ image_url: string; is_primary: boolean }>) ?? [];
  const primary = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
  return {
    id: p.id as string,
    name: p.name as string,
    slug: p.slug as string,
    price: p.price as number,
    sale_price: p.sale_price as number | null,
    stock_status: p.stock_status as string,
    is_halal: p.is_halal as boolean,
    storage_type: p.storage_type as string,
    unit_type: p.unit_type as string,
    rating_average: p.rating_average as number,
    rating_count: p.rating_count as number,
    primary_image: primary,
    categories: p.categories as { id: string; name: string; slug: string } | null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await getSeller(params.slug);
  if (!seller) return { title: 'Seller Not Found' };
  return {
    title: `${seller.display_name} | Baazar Marketplace`,
    description: seller.description || `Shop products from ${seller.display_name} on Baazar`,
  };
}

export default async function SellerProfilePage({ params, searchParams }: Props) {
  const seller = await getSeller(params.slug);
  if (!seller) notFound();

  const rawProducts = await getSellerProducts(seller.id, searchParams.sort);
  const products = rawProducts.map(p => mapProduct(p as Record<string, unknown>));

  // Build unique category list from all seller products
  const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
  products.forEach(p => {
    if (p.categories && !categoryMap.has(p.categories.slug)) {
      categoryMap.set(p.categories.slug, p.categories);
    }
  });
  const categories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Filter by selected category
  const currentCategory = searchParams.category ?? '';
  const currentSort = searchParams.sort ?? '';
  const filtered = currentCategory
    ? products.filter(p => p.categories?.slug === currentCategory)
    : products;

  const location = [seller.suburb, seller.state].filter(Boolean).join(', ');
  const memberSince = new Date(seller.created_at as string).getFullYear();

  function buildHref(overrides: Record<string, string>) {
    const sp = new URLSearchParams();
    if (currentSort) sp.set('sort', currentSort);
    if (currentCategory) sp.set('category', currentCategory);
    Object.entries(overrides).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    const qs = sp.toString();
    return `/seller/${params.slug}${qs ? `?${qs}` : ''}`;
  }

  const SORT_OPTIONS = [
    { value: '', label: 'Featured' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'price_asc', label: 'Price ↑' },
    { value: 'price_desc', label: 'Price ↓' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Banner */}
      <div className="relative h-40 sm:h-52 md:h-64 overflow-hidden bg-gray-900">
        <Image
          src={seller.banner_url || 'https://images.pexels.com/photos/3962294/pexels-photo-3962294.jpeg'}
          alt={`${seller.display_name} banner`}
          fill
          className="object-cover opacity-50"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute top-3 sm:top-4 inset-x-0">
          <div className="container-page">
            <nav className="flex items-center gap-1 text-xs text-white/60">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/80">Sellers</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white font-medium truncate max-w-[160px] sm:max-w-none">{seller.display_name}</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="container-page">
        {/* Profile card — overlaps banner */}
        <div className="relative -mt-14 sm:-mt-16 mb-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
              {/* Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-gray-100 flex-shrink-0 -mt-8 sm:-mt-12 ring-2 ring-gray-100">
                {seller.logo_url ? (
                  <Image
                    src={seller.logo_url}
                    alt={seller.display_name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(142,72%,28%)] to-[hsl(142,72%,20%)]">
                    <span className="text-white font-bold text-3xl">{seller.display_name[0].toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-1 sm:pt-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{seller.display_name}</h1>
                    {seller.business_name && seller.business_name !== seller.display_name && (
                      <p className="text-sm text-gray-500 mt-0.5">{seller.business_name}</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  {(seller.rating_count as number) > 0 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= Math.round(seller.rating_average as number)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-gray-900">{Number(seller.rating_average).toFixed(1)}</span>
                      <span className="text-gray-400 text-xs">({seller.rating_count})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    <span><span className="font-semibold text-gray-900">{products.length}</span> products</span>
                  </div>
                  {location && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Store className="w-3.5 h-3.5 text-gray-400" />
                    <span>Since {memberSince}</span>
                  </div>
                </div>

                {seller.description && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-none max-w-2xl">
                    {seller.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rating widget */}
        <SellerRatingWidget sellerId={seller.id} />

        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 mb-5">
          {/* Category filters */}
          {categories.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categories</p>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={buildHref({ category: '' })}
                  className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all ${
                    !currentCategory
                      ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]'
                  }`}
                >
                  All ({products.length})
                </Link>
                {categories.map(cat => {
                  const count = products.filter(p => p.categories?.slug === cat.slug).length;
                  const active = currentCategory === cat.slug;
                  return (
                    <Link
                      key={cat.slug}
                      href={buildHref({ category: cat.slug })}
                      className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all ${
                        active
                          ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]'
                      }`}
                    >
                      {cat.name} ({count})
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sort options */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map(o => (
                <Link
                  key={o.value}
                  href={buildHref({ sort: o.value })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    currentSort === o.value
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                  }`}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {filtered.length === 0
              ? 'No products found'
              : (
                <>
                  <span className="font-semibold text-gray-900">{filtered.length}</span>
                  {' '}product{filtered.length !== 1 ? 's' : ''}
                  {currentCategory && (
                    <> in <span className="font-medium text-[hsl(var(--primary))]">{categories.find(c => c.slug === currentCategory)?.name}</span></>
                  )}
                </>
              )
            }
          </p>
          {currentCategory && (
            <Link
              href={buildHref({ category: '' })}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              Clear filter
            </Link>
          )}
        </div>

        {/* Product grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 mb-8">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No products in this category yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Check back soon or browse all products</p>
            <Link
              href={`/seller/${params.slug}`}
              className="inline-block px-5 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              View All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-10">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
