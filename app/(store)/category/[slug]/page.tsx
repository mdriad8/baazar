export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/products/ProductGrid';
import ProductFilters from '@/components/products/ProductFilters';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Props {
  params: { slug: string };
  searchParams: Record<string, string>;
}

const CATEGORY_IMAGES: Record<string, string> = {
  'groceries': 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg',
  'halal-meat': 'https://images.pexels.com/photos/3688498/pexels-photo-3688498.jpeg',
  'seafood': 'https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg',
  'frozen-chilled': 'https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg',
  'rice-grains': 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg',
  'spices-condiments': 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg',
};

async function getCategory(slug: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('categories')
    .select('*, parent:parent_id(name, slug), children:categories!parent_id(id, name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

async function getCategoryProducts(categoryId: string, params: Record<string, string>) {
  const supabase = createServiceClient();

  let query = supabase
    .from('products')
    .select('id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type, rating_average, rating_count, product_images(image_url, is_primary), seller_profiles(display_name)')
    .eq('status', 'published')
    .eq('category_id', categoryId);

  if (params.halal === 'true') query = query.eq('is_halal', true);
  if (params.frozen === 'true') query = query.eq('storage_type', 'frozen');

  switch (params.sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'popular': query = query.order('purchase_count', { ascending: false }); break;
    default: query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  }

  const { data } = await query.limit(48);

  return (data ?? []).map((p: Record<string, unknown>) => {
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
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) return { title: 'Category Not Found' };

  return {
    title: category.seo_title || category.name,
    description: category.seo_description || category.description || `Shop ${category.name} on Baazar`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategory(params.slug);
  if (!category) notFound();

  const products = await getCategoryProducts(category.id, searchParams);
  const heroImage = category.image_url || CATEGORY_IMAGES[params.slug] || CATEGORY_IMAGES['groceries'];
  const children = category.children as Array<{id: string; name: string; slug: string}> | null;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Category hero */}
      <div className="relative h-40 md:h-56 overflow-hidden">
        <Image src={heroImage} alt={category.name} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 h-full flex items-center">
          <div className="container-page">
            <nav className="flex items-center gap-1.5 text-xs text-white/70 mb-2">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white font-medium">{category.name}</span>
            </nav>
            <h1 className="text-2xl md:text-4xl font-bold text-white">{category.name}</h1>
            {category.description && (
              <p className="text-white/80 mt-1 text-sm max-w-md hidden md:block">{category.description}</p>
            )}
            <p className="text-white/60 text-xs mt-1">{products.length} products</p>
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        {/* Subcategories */}
        {children && children.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {children.map(child => (
              <Link
                key={child.id}
                href={`/category/${child.slug}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-all"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <ProductFilters currentParams={searchParams} />
          </aside>

          <div className="flex-1">
            <ProductGrid products={products} columns={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
