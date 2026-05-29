'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Plus, Minus, Star, Share2, Shield, Truck, Thermometer, CircleAlert as AlertCircle, ChevronRight, Package, Camera, X, Loader as Loader2, LogIn, Check } from 'lucide-react';
import { useCart } from '@/lib/cart/context';
import { useAuth } from '@/lib/auth/context';
import { useWishlist } from '@/lib/wishlist/context';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductGrid from './ProductGrid';
import SectionHeader from '../home/SectionHeader';
import { cn } from '@/lib/utils';

interface ProductDetailProps {
  product: Record<string, unknown>;
  relatedProducts: unknown[];
  isPublished?: boolean;
}

// Unit types that use decimal/weight-based increments
const WEIGHT_UNITS = ['kg', 'g', 'litre', 'ml'];

function formatQty(qty: number, unit: string): string {
  if (WEIGHT_UNITS.includes(unit)) return `${qty % 1 === 0 ? qty : qty.toFixed(2)} ${unit}`;
  return `${qty}`;
}

export default function ProductDetail({ product, relatedProducts, isPublished = true }: ProductDetailProps) {
  const unitType = (product.unit_type as string) || 'each';
  const step = (product.quantity_step as number) || 1;
  const minQty = (product.min_order_qty as number) || step;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(minQty);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addItem, items } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const { toast } = useToast();
  const supabase = createClient();

  const wishlisted = isWishlisted(product.id as string);

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewImageUploading, setReviewImageUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [localReviews, setLocalReviews] = useState<Record<string, unknown>[] | null>(null);
  const reviewImageRef = useRef<HTMLInputElement>(null);

  const images = (product.product_images as Array<{id: string; image_url: string; alt_text: string; is_primary: boolean; sort_order: number}>) ?? [];
  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const tags = (product.product_tags as Array<{tag: string}>) ?? [];
  const reviews = localReviews ?? ((product.product_reviews as Array<Record<string, unknown>>) ?? []);
  const approvedReviews = reviews.filter(r => r.is_approved);
  const seller = product.seller_profiles as Record<string, unknown> | null;
  const category = product.categories as Record<string, unknown> | null;
  const brand = product.brands as Record<string, unknown> | null;

  const cartItem = items.find(i => i.product_id === product.id as string);
  const currentQtyInCart = cartItem?.quantity ?? 0;

  // Increment view_count once per page load
  useEffect(() => {
    supabase.rpc('increment_product_view', { p_product_id: product.id as string }).then(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const effectivePrice = (product.sale_price as number | null) ?? (product.price as number);
  const discount = product.sale_price ? Math.round((1 - (product.sale_price as number) / (product.price as number)) * 100) : 0;
  const isOutOfStock = product.stock_status === 'out_of_stock';

  const handleAddToCart = async () => {
    await addItem(product.id as string, quantity);
    toast({ title: currentQtyInCart > 0 ? 'Cart updated!' : 'Added to cart!', description: `${product.name as string} × ${formatQty(quantity, unitType)}` });
  };

  const currentImage = sortedImages[selectedImage]?.image_url
    ?? 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg';

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name as string, url });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshReviews = async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select('id, rating, title, body, images, created_at, is_approved, helpful_count, customer_profiles(first_name, last_name, avatar_url)')
      .eq('product_id', product.id as string)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    setLocalReviews(data ?? []);
  };

  const handleReviewImageUpload = async (file: File) => {
    setReviewImageUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `reviews/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setReviewImages(prev => [...prev, urlData.publicUrl]);
    } else {
      toast({ title: 'Image upload failed', variant: 'destructive' });
    }
    setReviewImageUploading(false);
  };

  const handleReviewSubmit = async () => {
    if (!user) return;
    if (reviewRating === 0) { toast({ title: 'Please select a star rating', variant: 'destructive' }); return; }
    if (!reviewBody.trim()) { toast({ title: 'Please write a comment', variant: 'destructive' }); return; }
    setReviewSubmitting(true);
    const { error } = await supabase.from('product_reviews').insert({
      product_id: product.id as string,
      user_id: user.id,
      rating: reviewRating,
      title: reviewTitle.trim() || null,
      body: reviewBody.trim(),
      images: reviewImages,
      is_approved: false,
    });
    if (error) {
      toast({ title: 'Could not submit review', description: error.message, variant: 'destructive' });
    } else {
      setReviewSubmitted(true);
      setReviewRating(0);
      setReviewTitle('');
      setReviewBody('');
      setReviewImages([]);
      toast({ title: 'Review submitted!', description: 'Your review is pending approval and will appear shortly.' });
      await refreshReviews();
    }
    setReviewSubmitting(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-page py-6">
        {/* Preview banner for non-published products */}
        {!isPublished && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Preview mode — this product is not yet live in the store
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Status: <span className="font-medium capitalize">{(product.status as string)?.replace(/_/g, ' ')}</span>. Only admins and the seller can view this page.
              </p>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          {category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/category/${category.slug as string}`} className="hover:text-foreground transition-colors">
                {category.name as string}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name as string}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100">
              <Image
                src={currentImage}
                alt={product.name as string}
                fill
                className="object-contain p-4"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {discount > 0 && (
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-sm font-bold rounded-lg">
                  -{discount}%
                </div>
              )}
              {product.is_halal && (
                <div className="absolute top-3 right-3">
                  <span className="badge-halal">Halal</span>
                </div>
              )}
            </div>

            {sortedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sortedImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      'relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all',
                      idx === selectedImage ? 'border-[hsl(var(--primary))]' : 'border-gray-200 hover:border-gray-400'
                    )}
                  >
                    <Image src={img.image_url} alt={img.alt_text || ''} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            {seller && (seller.slug as string) ? (
              <Link href={`/seller/${seller.slug as string}`} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--primary))] font-semibold hover:underline">
                {seller.display_name as string}
              </Link>
            ) : seller ? (
              <span className="text-sm text-gray-600 font-semibold">{seller.display_name as string}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))]">
                Baazar
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full border border-[hsl(var(--primary))]/20">Official Store</span>
              </span>
            )}

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                {product.name as string}
              </h1>
              {product.short_description && (
                <p className="text-muted-foreground mt-2 leading-relaxed">{product.short_description as string}</p>
              )}
            </div>

            {/* Rating — always shown; empty stars when no reviews yet */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    className={cn(
                      'w-4 h-4',
                      s <= Math.round((product.rating_average as number) ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-100 text-gray-300'
                    )}
                  />
                ))}
              </div>
              {(product.rating_count as number) > 0 ? (
                <>
                  <span className="text-sm font-semibold text-gray-800">{(product.rating_average as number).toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({product.rating_count as number} reviews)</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">No reviews yet</span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[hsl(var(--primary))]">
                ${effectivePrice.toFixed(2)}
              </span>
              {product.sale_price && (
                <span className="text-lg text-gray-400 line-through">${(product.price as number).toFixed(2)}</span>
              )}
              {product.unit_type && product.unit_type !== 'each' && (
                <span className="text-sm text-muted-foreground">/{product.unit_type as string}</span>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.is_halal && <span className="badge-halal"><Shield className="w-3 h-3" /> Halal Certified</span>}
              {product.storage_type === 'frozen' && <span className="badge-frozen"><Thermometer className="w-3 h-3" /> Frozen</span>}
              {product.storage_type === 'chilled' && <span className="badge-chilled"><Thermometer className="w-3 h-3" /> Chilled</span>}
              {product.stock_status === 'low_stock' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                  <AlertCircle className="w-3 h-3" /> Low Stock
                </span>
              )}
              {product.is_featured && (
                <Badge variant="secondary" className="text-xs">Featured</Badge>
              )}
            </div>

            {/* Quantity + Cart */}
            {!isPublished ? (
              <div className="py-4 px-5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-amber-800 text-sm">Not available for purchase</p>
                <p className="text-xs text-amber-700 mt-0.5">This product is pending approval and not yet live.</p>
              </div>
            ) : !isOutOfStock ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">
                    {WEIGHT_UNITS.includes(unitType) ? `Amount (${unitType}):` : 'Quantity:'}
                  </span>
                  <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(q => Math.max(minQty, parseFloat((q - step).toFixed(4))))}
                      disabled={quantity <= minQty}
                      className="px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-sm font-bold min-w-[4rem] text-center">
                      {formatQty(quantity, unitType)}
                    </span>
                    <button
                      onClick={() => setQuantity(q => parseFloat((q + step).toFixed(4)))}
                      className="px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {step !== 1 && (
                    <span className="text-xs text-muted-foreground">
                      in {formatQty(step, unitType)} increments
                    </span>
                  )}
                  {currentQtyInCart > 0 && (
                    <span className="text-xs text-muted-foreground">{formatQty(currentQtyInCart, unitType)} in cart</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAddToCart}
                    className={cn(
                      'flex-1 h-12 text-base font-semibold shadow-lg gap-2 transition-colors',
                      currentQtyInCart > 0
                        ? 'bg-[hsl(142,74%,24%)] hover:bg-[hsl(142,74%,20%)] text-white'
                        : 'bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white'
                    )}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {currentQtyInCart > 0 ? `In Cart (${formatQty(currentQtyInCart, unitType)}) · Add More` : 'Add to Cart'}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={wishlistLoading}
                    onClick={async () => {
                      if (wishlistLoading) return;
                      setWishlistLoading(true);
                      await toggle(product.id as string);
                      toast({
                        title: wishlisted ? 'Removed from wishlist' : 'Saved to wishlist',
                        description: !user ? 'Sign in to keep your wishlist across devices.' : undefined,
                      });
                      setWishlistLoading(false);
                    }}
                    className={cn('h-12 w-12 border-2', wishlisted && 'border-red-300 text-red-500 bg-red-50')}
                  >
                    <Heart className={cn('w-5 h-5', wishlisted && 'fill-current')} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                    title={copied ? 'Link copied!' : 'Share product'}
                    className={cn('h-12 w-12 border-2 transition-colors', copied && 'border-green-400 text-green-600 bg-green-50')}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-4 px-5 bg-gray-100 rounded-xl border border-gray-200 text-center">
                <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">Currently Out of Stock</p>
                <p className="text-sm text-muted-foreground mt-0.5">We'll notify you when it's back</p>
              </div>
            )}

            {/* Delivery info */}
            <div className="p-4 bg-[hsl(var(--secondary))] rounded-xl border border-[hsl(var(--primary))]/20 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span className="font-medium text-[hsl(var(--primary))]">Free delivery</span>
                <span className="text-muted-foreground">on orders over $80</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>30-day return policy</span>
              </div>
            </div>

            {/* Quick details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {brand && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Brand</span>
                  <span className="font-medium">{brand.name as string}</span>
                </div>
              )}
              {product.country_of_origin && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Origin</span>
                  <span className="font-medium">{product.country_of_origin as string}</span>
                </div>
              )}
              {product.sku && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">SKU</span>
                  <span className="font-medium font-mono text-xs">{product.sku as string}</span>
                </div>
              )}
              {product.weight_grams && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Weight</span>
                  <span className="font-medium">{(product.weight_grams as number) >= 1000 ? `${((product.weight_grams as number) / 1000).toFixed(2)}kg` : `${product.weight_grams as number}g`}</span>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <Link key={t.tag} href={`/products?q=${t.tag}`} className="px-2.5 py-1 bg-gray-100 hover:bg-[hsl(var(--accent))] text-xs text-gray-600 rounded-full transition-colors">
                    #{t.tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs - description, reviews */}
        <div className="bg-white rounded-2xl border border-gray-100 mb-10">
          <Tabs defaultValue="description">
            <div className="border-b overflow-x-auto scrollbar-hide">
              <TabsList className="flex w-max min-w-full justify-start rounded-none bg-transparent h-auto p-0 px-4">
                {['description', 'nutrition', 'reviews', 'seller'].map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="flex-shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary))] data-[state=active]:shadow-none bg-transparent px-4 py-3 capitalize text-sm font-medium whitespace-nowrap"
                  >
                    {tab === 'nutrition' ? 'Nutrition & Storage' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'reviews' && approvedReviews.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-[hsl(var(--primary))] text-white text-[10px] rounded-full">
                        {approvedReviews.length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="description" className="p-6">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                {product.description ? (
                  <p>{product.description as string}</p>
                ) : (
                  <p className="text-muted-foreground">No description available.</p>
                )}
              </div>
              {product.ingredients && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">Ingredients</h4>
                  <p className="text-sm text-gray-600">{product.ingredients as string}</p>
                </div>
              )}
              {(product.allergens as unknown[])?.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm mb-1">
                    <AlertCircle className="w-4 h-4" /> Allergen Information
                  </div>
                  <p className="text-sm text-orange-600">
                    Contains: {(product.allergens as string[]).join(', ')}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="nutrition" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.storage_instructions && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Storage Instructions</h4>
                    <p className="text-sm text-gray-600">{product.storage_instructions as string}</p>
                  </div>
                )}
                {product.expiry_days && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Shelf Life</h4>
                    <p className="text-sm text-gray-600">{product.expiry_days as number} days</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="p-6 space-y-8">
              {/* Rating summary */}
              {approvedReviews.length > 0 && (
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center flex-shrink-0">
                    <div className="text-4xl font-bold text-gray-900">
                      {(approvedReviews.reduce((s, r) => s + (r.rating as number), 0) / approvedReviews.length).toFixed(1)}
                    </div>
                    <div className="flex justify-center mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('w-4 h-4', s <= Math.round(approvedReviews.reduce((sum, r) => sum + (r.rating as number), 0) / approvedReviews.length) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{approvedReviews.length} review{approvedReviews.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map(star => {
                      const count = approvedReviews.filter(r => r.rating === star).length;
                      const pct = approvedReviews.length > 0 ? (count / approvedReviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-gray-500">{star}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-5 text-gray-400 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review list */}
              {approvedReviews.length === 0 ? (
                <div className="text-center py-6">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="font-medium text-gray-700">No reviews yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to review this product</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {approvedReviews.map(review => {
                    const profile = review.customer_profiles as Record<string, unknown> | null;
                    const imgs = (review.images as string[]) ?? [];
                    return (
                      <div key={review.id as string} className="pb-5 border-b border-gray-100 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(profile?.first_name as string)?.[0]?.toUpperCase() ?? 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {profile ? `${profile.first_name as string} ${((profile.last_name as string) ?? '')[0] ?? ''}.` : 'Anonymous'}
                              </span>
                              <div className="flex">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={cn('w-3.5 h-3.5', s <= (review.rating as number) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">{new Date(review.created_at as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {review.title && <p className="font-semibold text-sm mb-0.5">{review.title as string}</p>}
                            <p className="text-sm text-gray-600 leading-relaxed">{review.body as string}</p>
                            {imgs.length > 0 && (
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {imgs.map((url, idx) => (
                                  <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                    <Image src={url} alt="Review image" width={64} height={64} className="object-cover w-full h-full" unoptimized />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Write a review */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-bold text-base mb-4">Write a Review</h3>
                {!user ? (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <LogIn className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Sign in to leave a review</p>
                      <p className="text-xs text-muted-foreground">You need an account to share your experience.</p>
                    </div>
                    <Link href="/auth/login">
                      <Button size="sm" className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white text-xs">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                ) : reviewSubmitted ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-green-500 text-green-500" />
                    <div>
                      <p className="font-semibold">Thank you for your review!</p>
                      <p className="text-green-600 text-xs mt-0.5">It will appear once approved by our team.</p>
                    </div>
                    <button onClick={() => setReviewSubmitted(false)} className="ml-auto text-xs text-green-600 hover:text-green-800 underline">Write another</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Star rating picker */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rating <span className="text-red-500">*</span></label>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            onMouseEnter={() => setReviewHover(s)}
                            onMouseLeave={() => setReviewHover(0)}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <Star className={cn('w-8 h-8 transition-colors', s <= (reviewHover || reviewRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-100')} />
                          </button>
                        ))}
                        {reviewRating > 0 && (
                          <span className="ml-2 text-sm text-gray-500 self-center">
                            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Review Title <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        type="text"
                        value={reviewTitle}
                        onChange={e => setReviewTitle(e.target.value)}
                        placeholder="Summarise your experience..."
                        maxLength={100}
                        className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment <span className="text-red-500">*</span></label>
                      <textarea
                        value={reviewBody}
                        onChange={e => setReviewBody(e.target.value)}
                        placeholder="Share your experience with this product..."
                        rows={4}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] resize-none"
                      />
                    </div>

                    {/* Image upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Photos <span className="text-gray-400 font-normal">(optional, up to 4)</span></label>
                      <div className="flex gap-2 flex-wrap">
                        {reviewImages.map((url, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                            <Image src={url} alt="review" width={64} height={64} className="object-cover w-full h-full" unoptimized />
                            <button
                              type="button"
                              onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))}
                        {reviewImages.length < 4 && (
                          <button
                            type="button"
                            onClick={() => reviewImageRef.current?.click()}
                            disabled={reviewImageUploading}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-[hsl(var(--primary))] flex flex-col items-center justify-center gap-1 transition-colors text-gray-400 hover:text-[hsl(var(--primary))]"
                          >
                            {reviewImageUploading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Camera className="w-5 h-5" />
                                <span className="text-[10px]">Add photo</span>
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={reviewImageRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleReviewImageUpload(e.target.files[0])}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleReviewSubmit}
                      disabled={reviewSubmitting || reviewRating === 0}
                      className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2"
                    >
                      {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                      {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="seller" className="p-6">
              {seller ? (
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                    {seller.logo_url ? (
                      <Image src={seller.logo_url as string} alt={seller.display_name as string} width={64} height={64} className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-[hsl(var(--primary))] text-xl">
                        {(seller.display_name as string)[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{seller.display_name as string}</h3>
                    {(seller.rating_count as number) > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={cn('w-4 h-4', s <= Math.round(seller.rating_average as number) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">({seller.rating_count as number} reviews)</span>
                      </div>
                    )}
                    {(seller.slug as string) && (
                      <Link href={`/seller/${seller.slug as string}`} className="inline-flex items-center gap-1 mt-2 text-sm text-[hsl(var(--primary))] font-medium hover:underline">
                        View All Products <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[hsl(142,72%,28%)] to-[hsl(142,72%,18%)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-2xl tracking-tight">B</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-900">Baazar</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full border border-[hsl(var(--primary))]/20">Official Store</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Sourced and sold directly by Baazar. Quality guaranteed.</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section>
            <SectionHeader title="Related Products" viewAllHref="/products" />
            <ProductGrid products={relatedProducts as Parameters<typeof ProductGrid>[0]['products']} columns={4} />
          </section>
        )}
      </div>
    </div>
  );
}
