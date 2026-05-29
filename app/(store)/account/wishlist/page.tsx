'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { useWishlist } from '@/lib/wishlist/context';
import { createClient } from '@/lib/supabase/client';
import { Heart, ShoppingCart, Trash2, Package, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccountLayout from '@/components/account/AccountLayout';
import { useToast } from '@/hooks/use-toast';

interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  slug: string;
  status: string;
  primaryImage: string | null;
}

interface WishlistRow {
  id: string;
  product_id: string;
  added_at: string;
  products: {
    id: string;
    name: string;
    price: number;
    sale_price: number | null;
    slug: string;
    status: string;
    product_images: { image_url: string; is_primary: boolean; sort_order: number }[];
  } | null;
}

function toProduct(row: WishlistRow['products']): WishlistProduct | null {
  if (!row) return null;
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const primary = images.find(i => i.is_primary) ?? images[0];
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    sale_price: row.sale_price,
    slug: row.slug,
    status: row.status,
    primaryImage: primary?.image_url ?? null,
  };
}

const PRODUCT_SELECT = 'id, name, price, sale_price, slug, status, product_images(image_url, is_primary, sort_order)';

function ProductGrid({
  products,
  onRemove,
}: {
  products: WishlistProduct[];
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map(p => {
        const effectivePrice = p.sale_price ?? p.price;
        const discount = p.sale_price ? Math.round((1 - p.sale_price / p.price) * 100) : null;
        return (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
            <Link href={`/products/${p.slug}`} className="block relative aspect-square bg-gray-50">
              {p.primaryImage ? (
                <img
                  src={p.primaryImage}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-200" />
                </div>
              )}
              {discount && (
                <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  -{discount}%
                </span>
              )}
            </Link>
            <div className="p-3">
              <Link href={`/products/${p.slug}`}>
                <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug hover:text-[hsl(var(--primary))] transition-colors">
                  {p.name}
                </p>
              </Link>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-bold text-gray-900">${effectivePrice.toFixed(2)}</span>
                {p.sale_price && (
                  <span className="text-xs text-gray-400 line-through">${p.price.toFixed(2)}</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white"
                  onClick={() => router.push(`/products/${p.slug}`)}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" /> Add to Cart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-red-400 border-red-100 hover:bg-red-50 hover:border-red-200"
                  onClick={() => onRemove(p.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
      <Heart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No items saved yet</h3>
      <p className="text-gray-400 text-sm mb-6">Tap the heart icon on any product to save it here.</p>
      <Link href="/products">
        <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
          <Package className="w-4 h-4" /> Browse Products
        </Button>
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Guest view — shows items from localStorage with sign-in prompt
function GuestWishlistPage() {
  const { ids, toggle } = useWishlist();
  const supabase = createClient();
  const { toast } = useToast();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [fetching, setFetching] = useState(false);

  const guestIds = Array.from(ids);

  useEffect(() => {
    if (guestIds.length === 0) { setProducts([]); return; }
    setFetching(true);
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', guestIds)
      .then(({ data }) => {
        setProducts((data ?? []).map(r => toProduct(r as WishlistRow['products'])).filter(Boolean) as WishlistProduct[]);
        setFetching(false);
      });
  }, [ids.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (productId: string) => {
    await toggle(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({ title: 'Removed from wishlist' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">Items you've saved for later</p>
        </div>

        {/* Sign-in banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Sign in to save your wishlist</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {guestIds.length > 0
                ? `You have ${guestIds.length} item${guestIds.length > 1 ? 's' : ''} saved locally. Create an account or sign in to keep them forever.`
                : 'Create an account or sign in to access your wishlist from any device.'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/auth/login?next=/account/wishlist">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-1.5">
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Button>
            </Link>
            <Link href="/auth/register?next=/account/wishlist">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Create Account
              </Button>
            </Link>
          </div>
        </div>

        {fetching ? <LoadingSkeleton /> : products.length === 0 ? <EmptyState /> : (
          <ProductGrid products={products} onRemove={handleRemove} />
        )}
      </div>
    </div>
  );
}

// Authenticated view — loads from DB, keeps WishlistContext in sync
function AuthWishlistPage() {
  const { user } = useAuth();
  const { toggle } = useWishlist();
  const supabase = createClient();
  const { toast } = useToast();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('wishlist_items')
      .select(`id, product_id, added_at, products(${PRODUCT_SELECT})`)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('wishlist fetch error', error); }
        const rows = (data ?? []) as unknown as WishlistRow[];
        const prods: WishlistProduct[] = [];
        rows.forEach(row => {
          const p = toProduct(row.products);
          if (p) prods.push(p);
        });
        setProducts(prods);
        setFetching(false);
      });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (productId: string) => {
    // toggle() handles the DB delete AND updates WishlistContext.ids so the
    // header badge count stays accurate.
    await toggle(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({ title: 'Removed from wishlist' });
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">Items you've saved for later</p>
        </div>
        {fetching ? <LoadingSkeleton /> : products.length === 0 ? <EmptyState /> : (
          <ProductGrid products={products} onRemove={handleRemove} />
        )}
      </div>
    </AccountLayout>
  );
}

export default function WishlistPage() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <GuestWishlistPage />;
  return <AuthWishlistPage />;
}
