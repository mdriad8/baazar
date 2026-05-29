export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import ProductDetail from '@/components/products/ProductDetail';

interface Props {
  params: { slug: string };
}

async function getProduct(slug: string) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(id, image_url, alt_text, sort_order, is_primary),
        product_tags(tag),
        product_reviews(id, rating, title, body, created_at, is_approved, helpful_count,
          customer_profiles(first_name, last_name, avatar_url)
        ),
        categories(id, name, slug, parent_id),
        brands(name, slug, logo_url),
        seller_profiles(id, display_name, slug, logo_url, rating_average, rating_count, status)
      `)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[ProductPage] query error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[ProductPage] unexpected error:', err);
    return null;
  }
}

async function getRelatedProducts(categoryId: string, productId: string) {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, price, sale_price, stock_status, is_halal, storage_type, unit_type, rating_average, rating_count, product_images(image_url, is_primary), seller_profiles(display_name)')
      .eq('status', 'published')
      .eq('category_id', categoryId)
      .neq('id', productId)
      .limit(8);

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
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Product Not Found' };

  return {
    title: (product.seo_title as string) || (product.name as string),
    description: (product.seo_description as string) || (product.short_description as string) || (product.description as string)?.slice(0, 160),
    openGraph: {
      title: product.name as string,
      description: product.short_description as string,
      images: (product.product_images as Array<{is_primary: boolean; image_url: string}>)
        ?.filter(i => i.is_primary).map(i => i.image_url) ?? [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const related = product.category_id
    ? await getRelatedProducts(product.category_id as string, product.id as string)
    : [];

  const isPublished = product.status === 'published';

  return <ProductDetail product={product} relatedProducts={related} isPublished={isPublished} />;
}
