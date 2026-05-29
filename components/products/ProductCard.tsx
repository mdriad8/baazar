'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Plus, Minus, Star } from 'lucide-react';
import { useCart } from '@/lib/cart/context';
import { useAuth } from '@/lib/auth/context';
import { useWishlist } from '@/lib/wishlist/context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  is_featured?: boolean;
  primary_image?: string;
  seller_name?: string;
  is_sponsored?: boolean;
}

interface ProductCardProps {
  product: Product;
  className?: string;
  variant?: 'default' | 'compact' | 'horizontal';
}

export default function ProductCard({ product, className, variant = 'default' }: ProductCardProps) {
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { addItem, items, updateQuantity } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const { toast } = useToast();

  const wishlisted = isWishlisted(product.id);
  const cartItem = items.find(i => i.product_id === product.id && !i.saved_for_later);
  const currentQty = cartItem?.quantity ?? 0;

  const effectivePrice = product.sale_price ?? product.price;
  const discount = product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0;
  const isOutOfStock = product.stock_status === 'out_of_stock';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    await addItem(product.id);
    toast({ title: 'Added to cart', description: product.name });
  };

  const handleIncrease = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    await updateQuantity(cartItem.id, currentQty + 1);
  };

  const handleDecrease = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    await updateQuantity(cartItem.id, currentQty - 1);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (wishlistLoading) return;
    setWishlistLoading(true);
    await toggle(product.id);
    toast({
      title: isWishlisted(product.id) ? 'Removed from wishlist' : 'Saved to wishlist',
      description: !user ? 'Sign in to keep your wishlist across devices.' : undefined,
    });
    setWishlistLoading(false);
  };

  if (variant === 'horizontal') {
    return (
      <Link href={`/products/${product.slug}`} className={cn('flex gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all group', className)}>
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {product.primary_image ? (
            <Image src={product.primary_image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🛒</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{product.seller_name || 'Baazar'}</p>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-[hsl(var(--primary))]">${effectivePrice.toFixed(2)}</span>
            {product.sale_price && (
              <span className="text-xs text-gray-400 line-through">${product.price.toFixed(2)}</span>
            )}
          </div>
          {product.is_halal && (
            <span className="badge-halal mt-1">Halal</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn('group bg-white rounded-xl border border-gray-100 overflow-hidden card-hover flex flex-col', className)}
    >
      {/* Image — fixed height keeps card compact */}
      <div className="relative h-32 sm:h-36 bg-gray-50 overflow-hidden w-full flex-shrink-0">
        {product.primary_image ? (
          <Image
            src={product.primary_image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ShoppingCart className="w-8 h-8" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          {discount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
              -{discount}%
            </span>
          )}
          {product.is_halal && (
            <span className="badge-halal !text-[9px] !px-1.5 !py-0.5">Halal</span>
          )}
          {product.storage_type === 'frozen' && (
            <span className="badge-frozen !text-[9px] !px-1.5 !py-0.5">Frozen</span>
          )}
          {product.storage_type === 'chilled' && (
            <span className="badge-chilled !text-[9px] !px-1.5 !py-0.5">Chilled</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className={cn(
            'absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100',
            wishlisted ? 'bg-red-500 text-white opacity-100' : 'bg-white/90 text-gray-500 hover:text-red-500 hover:bg-white shadow-sm'
          )}
        >
          <Heart className={cn('w-3 h-3', wishlisted && 'fill-current')} />
        </button>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-[10px] font-semibold px-2 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2 flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(s => (
            <Star
              key={s}
              className={cn(
                'w-2.5 h-2.5',
                s <= Math.round(product.rating_average ?? 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-100 text-gray-300'
              )}
            />
          ))}
          {(product.rating_count ?? 0) > 0 && (
            <span className="text-[10px] text-gray-400 ml-0.5">({product.rating_count})</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-[hsl(var(--primary))]">
            ${effectivePrice.toFixed(2)}
          </span>
          {product.sale_price && (
            <span className="text-[10px] text-gray-400 line-through">${product.price.toFixed(2)}</span>
          )}
        </div>

        {/* Cart controls */}
        {!isOutOfStock && (
          <div className="mt-0.5">
            {currentQty === 0 ? (
              <button
                onClick={handleAddToCart}
                className="w-full py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-semibold rounded-lg hover:bg-[hsl(142,74%,24%)] transition-all active:scale-[0.98] flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            ) : (
              <div className="flex items-center justify-between border-2 border-[hsl(var(--primary))] rounded-lg overflow-hidden">
                <button
                  onClick={handleDecrease}
                  className="flex-1 py-1 flex items-center justify-center text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-[hsl(var(--primary))] min-w-[1.5rem] text-center">
                  {currentQty}
                </span>
                <button
                  onClick={handleIncrease}
                  className="flex-1 py-1 flex items-center justify-center text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
