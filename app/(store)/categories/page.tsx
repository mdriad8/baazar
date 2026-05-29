export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { createServiceClient } from '@/lib/supabase/server';
import { ChevronRight } from 'lucide-react';

const CATEGORY_IMAGES: Record<string, string> = {
  'groceries': 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg',
  'halal-meat': 'https://images.pexels.com/photos/3688498/pexels-photo-3688498.jpeg',
  'seafood': 'https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg',
  'frozen-chilled': 'https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg',
  'rice-grains': 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg',
  'spices-condiments': 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg',
  'snacks-sweets': 'https://images.pexels.com/photos/2113756/pexels-photo-2113756.jpeg',
  'drinks-beverages': 'https://images.pexels.com/photos/2531187/pexels-photo-2531187.jpeg',
  'household-products': 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg',
  'dairy-eggs': 'https://images.pexels.com/photos/3735159/pexels-photo-3735159.jpeg',
  'bread-bakery': 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg',
  'oils-ghee': 'https://images.pexels.com/photos/1035711/pexels-photo-1035711.jpeg',
};

export default async function CategoriesPage() {
  const supabase = createServiceClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, parent_id')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('sort_order');

  const items = categories ?? [];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-page py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Categories</h1>
          <p className="text-muted-foreground mt-1">Browse all {items.length} product categories</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {items.map(category => {
            const imgUrl = category.image_url || CATEGORY_IMAGES[category.slug] || CATEGORY_IMAGES['groceries'];
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={imgUrl}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-400"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-gray-900 group-hover:text-[hsl(var(--primary))] transition-colors">{category.name}</h3>
                  {category.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-[hsl(var(--primary))] font-medium">
                    Shop Now <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
