'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Star, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccountLayout from '@/components/account/AccountLayout';

interface Review {
  id: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  is_verified: boolean;
  products: {
    name: string;
    slug: string;
    product_images: Array<{ image_url: string; is_primary: boolean }>;
  } | null;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn(sz, i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200')} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchReviews = async () => {
      setFetching(true);
      const { data } = await supabase
        .from('product_reviews')
        .select(`
          id, rating, title, body, created_at, is_verified,
          products(name, slug, product_images(image_url, is_primary))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setReviews((data as unknown as Review[]) ?? []);
      setFetching(false);
    };
    fetchReviews();
  }, [user, supabase]);

  if (loading) return (
    <AccountLayout>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-24" />
        ))}
      </div>
    </AccountLayout>
  );
  if (!user) return null;

  return (
    <AccountLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} written</p>
        </div>

        {fetching ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="font-bold text-gray-900 mb-2">No reviews yet</h2>
            <p className="text-sm text-muted-foreground mb-5">After you receive an order, share your experience with other shoppers.</p>
            <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] hover:underline">
              View my orders
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => {
              const images = review.products?.product_images ?? [];
              const img = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url;
              return (
                <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                      {img ? (
                        <img src={img} alt={review.products?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-7 h-7 text-gray-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/products/${review.products?.slug ?? '#'}`}
                            className="font-semibold text-sm text-gray-900 hover:text-[hsl(var(--primary))] transition-colors line-clamp-1"
                          >
                            {review.products?.name ?? 'Product'}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={review.rating} />
                            {review.is_verified && (
                              <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {review.title && <p className="font-medium text-sm mt-2">{review.title}</p>}
                      {review.body && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{review.body}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
