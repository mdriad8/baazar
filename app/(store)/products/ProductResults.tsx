import { createServiceClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/products/ProductGrid';
import ProductPagination from './ProductPagination';

interface SearchParams {
  q?: string;
  halal?: string;
  frozen?: string;
  chilled?: string;
  min_price?: string;
  max_price?: string;
  sort?: string;
  featured?: string;
  trending?: string;
  page?: string;
}

const PER_PAGE = 30;

function effectivePrice(p: Record<string, unknown>): number {
  return (p.sale_price as number | null) ?? (p.price as number);
}

async function getProducts(params: SearchParams) {
  const supabase = createServiceClient();
  const page = Math.max(1, parseInt(params.page ?? '1'));

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, price, sale_price, stock_status, is_halal, storage_type,
      unit_type, rating_average, rating_count,
      product_images(image_url, is_primary),
      seller_profiles(display_name),
      categories(name, slug)
    `, { count: 'exact' })
    .eq('status', 'published');

  if (params.q) query = query.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  if (params.halal === 'true') query = query.eq('is_halal', true);
  if (params.frozen === 'true') query = query.eq('storage_type', 'frozen');
  if (params.chilled === 'true') query = query.eq('storage_type', 'chilled');
  if (params.featured === 'true') query = query.eq('is_featured', true);
  if (params.trending === 'true') query = query.eq('is_trending', true);

  const needsPriceSort = params.sort === 'price_asc' || params.sort === 'price_desc';
  const needsPriceFilter = !!(params.min_price || params.max_price);

  if (!needsPriceSort) {
    switch (params.sort) {
      case 'rating':  query = query.order('rating_average', { ascending: false }); break;
      case 'newest':  query = query.order('created_at', { ascending: false }); break;
      case 'popular': query = query.order('purchase_count', { ascending: false }); break;
      default:        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    }
  }

  // For price sort/filter we fetch all matching rows and handle in JS
  if (!needsPriceSort && !needsPriceFilter) {
    query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  }

  const { data: rawData, count } = await query;
  let data: Record<string, unknown>[] = rawData ?? [];

  if (needsPriceFilter) {
    const min = params.min_price ? parseFloat(params.min_price) : null;
    const max = params.max_price ? parseFloat(params.max_price) : null;
    data = data.filter(p => {
      const ep = effectivePrice(p);
      if (min !== null && ep < min) return false;
      if (max !== null && ep > max) return false;
      return true;
    });
  }

  let totalCount = count ?? data.length;

  if (needsPriceSort) {
    data = [...data].sort((a, b) => {
      const ea = effectivePrice(a);
      const eb = effectivePrice(b);
      return params.sort === 'price_asc' ? ea - eb : eb - ea;
    });
    totalCount = data.length;
    const start = (page - 1) * PER_PAGE;
    data = data.slice(start, start + PER_PAGE);
  } else if (needsPriceFilter) {
    totalCount = data.length;
    const start = (page - 1) * PER_PAGE;
    data = data.slice(start, start + PER_PAGE);
  }

  const products = data.map(p => {
    const images = (p.product_images as Array<{ image_url: string; is_primary: boolean }>) ?? [];
    const primary = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
    const seller = p.seller_profiles as { display_name: string } | null;
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

  return { products, totalCount, page, totalPages: Math.ceil(totalCount / PER_PAGE) };
}

export default async function ProductResults({ searchParams }: { searchParams: SearchParams }) {
  const { products, totalCount, page, totalPages } = await getProducts(searchParams);

  const title = searchParams.q
    ? `Search results for "${searchParams.q}"`
    : searchParams.featured === 'true' ? 'Featured Products'
    : searchParams.trending === 'true' ? 'Trending Products'
    : searchParams.halal === 'true' ? 'Halal Certified Products'
    : 'All Products';

  const start = (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, totalCount);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {totalCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Showing {start}–{end} of {totalCount} products
            </p>
          )}
          {totalCount === 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">0 products found</p>
          )}
        </div>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground hidden sm:block">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      <ProductGrid products={products} columns={6} />

      {totalPages > 1 && (
        <ProductPagination
          currentPage={page}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      )}
    </div>
  );
}
