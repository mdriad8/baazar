import ProductCard from './ProductCard';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  stock_status: string;
  is_halal?: boolean;
  storage_type?: string;
  unit_type?: string;
  rating_average?: number;
  rating_count?: number;
  primary_image?: string;
  seller_name?: string;
  is_sponsored?: boolean;
}

interface ProductGridProps {
  products: Product[];
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export default function ProductGrid({ products, className, columns = 6 }: ProductGridProps) {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[columns];

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-3">🛒</div>
        <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className={cn(`grid ${gridClass} gap-3 sm:gap-4`, className)}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
