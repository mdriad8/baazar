export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import ProductFilters from '@/components/products/ProductFilters';
import ProductResults from './ProductResults';
import MobileFilterDrawer from './MobileFilterDrawer';

interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
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

const SORT_LABELS: Record<string, string> = {
  newest: 'Newest',
  popular: 'Popular',
  price_asc: 'Price ↑',
  price_desc: 'Price ↓',
  rating: 'Top Rated',
};

function countActiveFilters(p: SearchParams) {
  return [p.halal, p.frozen, p.chilled, p.featured, p.trending, p.min_price, p.max_price, p.sort]
    .filter(Boolean).length;
}

function ProductResultsSkeleton() {
  return (
    <div>
      <div className="mb-4">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="h-32 sm:h-36 bg-gray-100 animate-pulse" />
            <div className="p-2 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="h-7 bg-gray-100 rounded-lg animate-pulse mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const resultsKey = JSON.stringify(searchParams);
  const activeFilterCount = countActiveFilters(searchParams);
  const currentParams = searchParams as Record<string, string>;

  return (
    <div
      className="container-page flex flex-col lg:flex-row gap-0 lg:gap-6"
      style={{ height: 'calc(100vh - 144px)' }}
    >
      {/* Desktop filter sidebar — independently scrollable */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
        <div className="py-6 px-4">
          <ProductFilters currentParams={currentParams} />
        </div>
      </aside>

      {/* Main content — independently scrollable */}
      <div className="flex-1 min-w-0 overflow-y-auto py-4 lg:py-6">
        {/* Mobile filter/sort bar — hidden on desktop */}
        <div className="flex items-center gap-2 mb-4 lg:hidden">
          <MobileFilterDrawer
            currentParams={currentParams}
            activeFilterCount={activeFilterCount}
          />
          {searchParams.sort && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
              {SORT_LABELS[searchParams.sort] ?? searchParams.sort}
            </span>
          )}
          {searchParams.q && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full truncate max-w-[140px]">
              &ldquo;{searchParams.q}&rdquo;
            </span>
          )}
        </div>

        <Suspense key={resultsKey} fallback={<ProductResultsSkeleton />}>
          <ProductResults searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
