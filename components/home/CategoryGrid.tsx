import Link from 'next/link';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  icon?: string;
}

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

const CATEGORY_COLORS: Record<string, string> = {
  'groceries': 'from-green-500/20 to-green-600/40',
  'halal-meat': 'from-red-500/20 to-red-600/40',
  'seafood': 'from-blue-500/20 to-blue-600/40',
  'frozen-chilled': 'from-cyan-500/20 to-cyan-600/40',
  'rice-grains': 'from-yellow-500/20 to-yellow-600/40',
  'spices-condiments': 'from-orange-500/20 to-orange-600/40',
  'snacks-sweets': 'from-pink-500/20 to-pink-600/40',
  'drinks-beverages': 'from-teal-500/20 to-teal-600/40',
  'household-products': 'from-purple-500/20 to-purple-600/40',
  'dairy-eggs': 'from-indigo-500/20 to-indigo-600/40',
  'bread-bakery': 'from-amber-500/20 to-amber-600/40',
  'oils-ghee': 'from-lime-500/20 to-lime-600/40',
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Groceries', slug: 'groceries' },
  { id: '2', name: 'Halal Meat', slug: 'halal-meat' },
  { id: '3', name: 'Seafood', slug: 'seafood' },
  { id: '4', name: 'Frozen & Chilled', slug: 'frozen-chilled' },
  { id: '5', name: 'Rice & Grains', slug: 'rice-grains' },
  { id: '6', name: 'Spices', slug: 'spices-condiments' },
  { id: '7', name: 'Snacks & Sweets', slug: 'snacks-sweets' },
  { id: '8', name: 'Drinks', slug: 'drinks-beverages' },
  { id: '9', name: 'Household', slug: 'household-products' },
  { id: '10', name: 'Dairy & Eggs', slug: 'dairy-eggs' },
  { id: '11', name: 'Bread & Bakery', slug: 'bread-bakery' },
  { id: '12', name: 'Oils & Ghee', slug: 'oils-ghee' },
];

export default function CategoryGrid({ categories = DEFAULT_CATEGORIES }: { categories?: Category[] }) {
  const items = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
      {items.map(category => {
        const imgUrl = category.image_url || CATEGORY_IMAGES[category.slug] || CATEGORY_IMAGES['groceries'];
        const colorClass = CATEGORY_COLORS[category.slug] || 'from-gray-500/20 to-gray-600/40';

        return (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group flex flex-col items-center gap-2 cursor-pointer"
          >
            <div className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${colorClass} border border-white/50 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1`}>
              <Image
                src={imgUrl}
                alt={category.name}
                fill
                className="object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-all duration-300"
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 150px"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClass}`} />
            </div>
            <span className="text-xs font-semibold text-gray-700 group-hover:text-[hsl(var(--primary))] transition-colors text-center leading-tight">
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
