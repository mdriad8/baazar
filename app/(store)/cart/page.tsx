'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Trash2, Plus, Minus, Tag, ArrowRight,
  Bookmark, RotateCcw, Package, ShieldCheck, LogIn, UserPlus,
} from 'lucide-react';
import { useCart } from '@/lib/cart/context';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, GST_RATE } from '@/lib/constants';

export default function CartPage() {
  const { items, updateQuantity, removeItem, saveForLater, moveToCart, subtotal, isGuest } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const activeItems = items.filter(i => !i.saved_for_later);
  const savedItems = items.filter(i => i.saved_for_later);

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const gstAmount = subtotal * GST_RATE;
  const discount = promoApplied ? promoDiscount : 0;
  const total = subtotal + deliveryFee + gstAmount - discount;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoLoading(true);
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), order_amount: subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.message ?? 'Invalid promo code');
        setPromoApplied(false);
        setPromoDiscount(0);
      } else {
        setPromoApplied(true);
        setPromoDiscount(data.discount ?? 0);
      }
    } catch {
      setPromoError('Could not validate promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoCode('');
    setPromoError('');
  };

  if (activeItems.length === 0 && savedItems.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add products to your cart to start shopping.</p>
        <Link href="/products">
          <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
            <Package className="w-4 h-4" /> Browse Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart ({activeItems.length} items)</h1>

      {/* Guest nudge banner */}
      {isGuest && (
        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">Your cart is saved temporarily</p>
            <p className="text-xs text-amber-700 mt-0.5">Sign in or create a free account to save your cart permanently and track your orders.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/auth/login?redirect=/checkout`}>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100 bg-transparent">
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Button>
            </Link>
            <Link href={`/auth/register?redirect=/checkout`}>
              <Button size="sm" className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0">
                <UserPlus className="w-3.5 h-3.5" /> Register
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {activeItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm">
              <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                {item.product.primary_image ? (
                  <Image src={item.product.primary_image} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.product.seller_name}</p>
                    <Link href={`/products/${item.product.slug}`} className="font-semibold text-sm text-gray-900 hover:text-[hsl(var(--primary))] transition-colors line-clamp-2">
                      {item.product.name}
                    </Link>
                    <div className="flex gap-1 mt-1">
                      {item.product.is_halal && <span className="badge-halal text-[10px]">Halal</span>}
                      {item.product.storage_type === 'frozen' && <span className="badge-frozen text-[10px]">Frozen</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-[hsl(var(--primary))]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-bold min-w-[2rem] text-center border-x border-gray-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-[hsl(var(--primary))]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[hsl(var(--primary))]">
                      ${((item.product.sale_price ?? item.product.price) * item.quantity).toFixed(2)}
                    </div>
                    {item.product.sale_price && (
                      <div className="text-xs text-gray-400 line-through">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => saveForLater(item.id)}
                  className="text-xs text-muted-foreground hover:text-[hsl(var(--primary))] mt-2 flex items-center gap-1 transition-colors"
                >
                  <Bookmark className="w-3 h-3" /> Save for later
                </button>
              </div>
            </div>
          ))}

          {/* Saved for later */}
          {savedItems.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Saved for Later ({savedItems.length})
              </h3>
              {savedItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-dashed border-gray-200 p-3 flex gap-3 items-center opacity-75">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    {item.product.primary_image && (
                      <Image src={item.product.primary_image} alt={item.product.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-sm font-bold text-[hsl(var(--primary))]">${(item.product.sale_price ?? item.product.price).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => moveToCart(item.id)}
                    className="text-xs flex items-center gap-1 text-[hsl(var(--primary))] font-medium hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Move to cart
                  </button>
                  <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          {/* Promo code */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-[hsl(var(--primary))]" /> Promo Code
            </h3>
            {promoApplied ? (
              <div className="flex items-center justify-between bg-[hsl(var(--secondary))] rounded-lg px-3 py-2">
                <p className="text-xs text-[hsl(var(--primary))] font-medium">
                  {promoCode} applied — save ${promoDiscount.toFixed(2)}
                </p>
                <button onClick={removePromo} className="text-xs text-red-500 hover:text-red-700 font-medium ml-2">Remove</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                    placeholder="Enter promo code"
                    className="uppercase text-sm h-9"
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                  />
                  <Button
                    onClick={applyPromo}
                    disabled={promoLoading}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] flex-shrink-0"
                  >
                    {promoLoading ? '...' : 'Apply'}
                  </Button>
                </div>
                {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
              </>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm lg:sticky lg:top-24">
            <h3 className="font-bold text-base mb-4">Order Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({activeItems.length} items)</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[hsl(var(--primary))]">
                  <span>Promo discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className={cn('font-medium', deliveryFee === 0 && 'text-[hsl(var(--primary))]')}>
                  {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (10%)</span>
                <span className="font-medium">${gstAmount.toFixed(2)}</span>
              </div>
              {subtotal < FREE_DELIVERY_THRESHOLD && (
                <div className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-2">
                  Add ${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for free delivery
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                    <div
                      className="bg-[hsl(var(--primary))] h-1 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="pt-2.5 border-t flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-[hsl(var(--primary))]">${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={() => router.push(isGuest ? '/auth/login?redirect=/checkout' : '/checkout')}
              className="w-full mt-5 h-12 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold text-base gap-2 shadow-lg"
            >
              {isGuest ? (
                <><LogIn className="w-4 h-4" /> Sign in to Checkout</>
              ) : (
                <>Proceed to Checkout <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
              <span>Secure checkout powered by Stripe</span>
            </div>

            <div className="mt-3 flex justify-center gap-2">
              {['Visa', 'MC', 'PayPal', 'Afterpay'].map(p => (
                <span key={p} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
