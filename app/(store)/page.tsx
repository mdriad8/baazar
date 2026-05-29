export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createServiceClient } from '@/lib/supabase/server';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryGrid from '@/components/home/CategoryGrid';
import TrustBanner from '@/components/home/TrustBanner';
import SectionHeader from '@/components/home/SectionHeader';
import ProductGrid from '@/components/products/ProductGrid';
import AdBannerStrip from '@/components/home/AdBannerStrip';
import { Tag, ChevronRight } from 'lucide-react';

async function getHomeData() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const adSelect = 'id, name, headline, tagline, cta_text, cta_url, banner_image_url, placement, products(id, name, slug, price, sale_price, product_images(image_url, is_primary), seller_profiles(display_name))';
  const activeAdFilter = (q: ReturnType<typeof supabase.from>) =>
    (q as unknown as { eq: (col: string, val: string) => unknown })
      .eq('admin_approval_status', 'approved')
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today);

  const [bannersRes, categoriesRes, featuredRes, trendingRes, newArrivalsRes, sponsoredRes, adsHeroRes, adsMidRes] = await Promise.all([
    supabase.from('homepage_banners').select('*').eq('is_active', true).eq('position', 'hero').order('sort_order'),
    supabase.from('categories').select('id, name, slug, image_url').eq('is_active', true).eq('is_featured', true).order('sort_order').limit(12),
    supabase.from('products')
      .select('id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type, rating_average, rating_count, product_images(image_url, is_primary), seller_profiles(display_name)')
      .eq('status', 'published').eq('is_featured', true).order('created_at', { ascending: false }).limit(6),
    supabase.from('products')
      .select('id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type, rating_average, rating_count, product_images(image_url, is_primary), seller_profiles(display_name)')
      .eq('status', 'published').eq('is_trending', true).order('purchase_count', { ascending: false }).limit(6),
    supabase.from('products')
      .select('id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type, rating_average, rating_count, product_images(image_url, is_primary), seller_profiles(display_name)')
      .eq('status', 'published').order('created_at', { ascending: false }).limit(6),
    supabase.from('campaigns')
      .select('id, placement, products(id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type, rating_average, rating_count, product_images(image_url, is_primary), seller_profiles(display_name))')
      .eq('admin_approval_status', 'approved')
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(8),
    supabase.from('campaigns')
      .select(adSelect)
      .eq('admin_approval_status', 'approved')
      .eq('status', 'active')
      .eq('placement', 'hero_banner')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('priority', { ascending: false })
      .limit(1),
    supabase.from('campaigns')
      .select(adSelect)
      .eq('admin_approval_status', 'approved')
      .eq('status', 'active')
      .eq('placement', 'mid_page')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('priority', { ascending: false })
      .limit(3),
  ]);

  const mapProducts = (data: Record<string, unknown>[] | null) =>
    (data ?? []).map(p => {
      const images = (p.product_images as Array<{image_url: string; is_primary: boolean}>) ?? [];
      const primary = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
      const seller = p.seller_profiles as {display_name: string} | null;
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
        seller_name: seller?.display_name ?? 'Baazar',
      };
    });

  const sponsoredProducts = (sponsoredRes.data ?? []).map((c: Record<string, unknown>) => {
    const p = c.products as Record<string, unknown>;
    if (!p) return null;
    const images = (p.product_images as Array<{image_url: string; is_primary: boolean}>) ?? [];
    const primary = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
    const seller = p.seller_profiles as {display_name: string} | null;
    return {
      id: p.id as string, name: p.name as string, slug: p.slug as string,
      price: p.price as number, sale_price: p.sale_price as number | null,
      stock_status: p.stock_status as string, is_halal: p.is_halal as boolean,
      storage_type: p.storage_type as string, unit_type: p.unit_type as string,
      rating_average: p.rating_average as number, rating_count: p.rating_count as number,
      primary_image: primary, seller_name: seller?.display_name ?? 'Baazar',
    };
  }).filter(Boolean);

  return {
    banners: bannersRes.data ?? [],
    categories: categoriesRes.data ?? [],
    featured: mapProducts(featuredRes.data as Record<string, unknown>[] | null),
    trending: mapProducts(trendingRes.data as Record<string, unknown>[] | null),
    newArrivals: mapProducts(newArrivalsRes.data as Record<string, unknown>[] | null),
    sponsored: sponsoredProducts,
    adsHero: (adsHeroRes.data ?? []) as Parameters<typeof AdBannerStrip>[0]['ads'],
    adsMid: (adsMidRes.data ?? []) as Parameters<typeof AdBannerStrip>[0]['ads'],
  };
}

export default async function HomePage() {
  const { banners, categories, featured, trending, newArrivals, sponsored, adsHero, adsMid } = await getHomeData();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero section */}
      <section className="container-page pt-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <HeroBanner banners={banners as Parameters<typeof HeroBanner>[0]['banners']} />
          </div>

          {/* Sub banners */}
          <div className="hidden lg:flex flex-col gap-3">
            <Link href="/category/halal-meat" className="relative overflow-hidden rounded-2xl group flex-1">
              <Image
                src="https://images.pexels.com/photos/3688498/pexels-photo-3688498.jpeg"
                alt="Halal Meat"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-400"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="badge-halal mb-1">Halal Certified</span>
                <h3 className="text-white font-bold text-sm">Fresh Halal Meat</h3>
                <span className="text-xs text-emerald-300 flex items-center gap-1 mt-0.5">
                  Shop Now <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
            <Link href="/deals" className="relative overflow-hidden rounded-2xl group flex-1">
              <Image
                src="https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg"
                alt="Deals"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-400"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-1 mb-1">
                  <Tag className="w-3 h-3 text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">Special Deals</span>
                </div>
                <h3 className="text-white font-bold text-sm">Up to 40% Off</h3>
                <span className="text-xs text-orange-300 flex items-center gap-1 mt-0.5">
                  View Deals <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust features */}
      <section className="container-page pb-6">
        <TrustBanner />
      </section>

      {/* Categories */}
      <section className="container-page pb-8">
        <SectionHeader
          title="Shop by Category"
          subtitle="Find everything you need from our wide selection"
          viewAllHref="/categories"
        />
        <CategoryGrid categories={categories as Parameters<typeof CategoryGrid>[0]['categories']} />
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="container-page pb-8">
          <SectionHeader
            title="Featured Products"
            subtitle="Handpicked selections from our best sellers"
            viewAllHref="/products?featured=true"
          />
          <ProductGrid products={featured} columns={6} />
        </section>
      )}

      {/* Ad Slot 1 — Hero Banner Ad (full width, appears after featured products) */}
      {adsHero.length > 0 && (
        <section className="container-page pb-8">
          <AdBannerStrip ads={adsHero} variant="wide" />
        </section>
      )}

      {/* Promo banner */}
      <section className="container-page pb-8">
        <div className="bg-gradient-to-r from-[hsl(142,72%,29%)] to-[hsl(142,65%,22%)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-full opacity-5">
            <div className="w-full h-full bg-white rounded-full translate-x-16 -translate-y-16 scale-150" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-emerald-200" />
              <span className="text-emerald-200 text-sm font-medium">Limited Time Offer</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Use Code: WELCOME10</h2>
            <p className="text-emerald-100 mt-1">Get 10% off your first order. Minimum order $30.</p>
          </div>
          <Link
            href="/products"
            className="relative z-10 flex-shrink-0 px-6 py-3 bg-white text-[hsl(var(--primary))] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-lg text-sm"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Trending Products */}
      {trending.length > 0 && (
        <section className="container-page pb-8">
          <SectionHeader
            title="Trending Now"
            subtitle="What everyone is buying this week"
            viewAllHref="/products?trending=true"
          />
          <ProductGrid products={trending} columns={6} />
        </section>
      )}

      {/* Sponsored Products */}
      {sponsored.length > 0 && (
        <section className="container-page pb-8">
          <SectionHeader
            title="Sponsored Products"
            subtitle="Promoted by our trusted sellers"
            viewAllHref="/products"
          />
          <div className="relative">
            <ProductGrid products={sponsored as Parameters<typeof ProductGrid>[0]['products']} columns={6} />
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Sponsored</span>
            </div>
          </div>
        </section>
      )}

      {/* Ad Slot 2 — Mid-page multi-card ads (up to 3 side by side) */}
      {adsMid.length > 0 && (
        <section className="container-page pb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sponsored</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <AdBannerStrip ads={adsMid} variant="compact" />
        </section>
      )}

      {/* Halal section */}
      <section className="container-page pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Halal Chicken',
              desc: 'Whole, cuts, mince & more',
              img: 'https://images.pexels.com/photos/6210747/pexels-photo-6210747.jpeg',
              href: '/category/halal-chicken',
              badge: 'Halal',
            },
            {
              title: 'Lamb & Mutton',
              desc: 'Premium cuts & traditional',
              img: 'https://images.pexels.com/photos/3535383/pexels-photo-3535383.jpeg',
              href: '/category/halal-lamb',
              badge: 'Halal',
            },
            {
              title: 'Fresh Seafood',
              desc: 'Prawns, fish, crab & more',
              img: 'https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg',
              href: '/category/seafood',
              badge: 'Fresh',
            },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="relative overflow-hidden rounded-2xl group h-40 md:h-52"
            >
              <Image
                src={item.img}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-400"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="badge-halal mb-1.5">{item.badge}</span>
                <h3 className="text-white font-bold text-base">{item.title}</h3>
                <p className="text-gray-200 text-xs mt-0.5">{item.desc}</p>
                <span className="text-xs text-emerald-300 flex items-center gap-1 mt-1.5 font-medium">
                  Shop Now <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="container-page pb-10">
          <SectionHeader
            title="New Arrivals"
            subtitle="Just landed — discover the latest additions"
            viewAllHref="/products?sort=newest"
          />
          <ProductGrid products={newArrivals} columns={6} />
        </section>
      )}

      {/* B2B Banner */}
      <section className="container-page pb-10">
        <div className="bg-gray-900 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full mb-3">
              For Businesses
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Sell Your Products on Baazar
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed max-w-md">
              Join hundreds of South Asian food businesses selling across Australia. Get access to thousands of customers, easy product management, and fast payouts.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link
                href="/seller-apply"
                className="px-5 py-2.5 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold rounded-xl text-sm transition-all shadow-lg"
              >
                Apply to Sell
              </Link>
              <Link
                href="/sell-on-baazar"
                className="px-5 py-2.5 border border-gray-600 text-gray-200 hover:border-gray-400 hover:text-white font-semibold rounded-xl text-sm transition-all"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {[
              { num: '500+', label: 'Active Sellers' },
              { num: '10K+', label: 'Products' },
              { num: '50K+', label: 'Customers' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-4 bg-gray-800 rounded-xl min-w-[80px]">
                <div className="text-xl font-bold text-[hsl(var(--primary))]">{stat.num}</div>
                <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
