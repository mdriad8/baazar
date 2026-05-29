'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, CreditCard, Shield, ShieldCheck, ChevronRight, Check, Truck, Clock, CircleAlert as AlertCircle, Mail, Phone, CircleCheck as CheckCircle2 } from 'lucide-react';
import { useCart } from '@/lib/cart/context';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, GST_RATE } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Step = 'address' | 'delivery' | 'payment' | 'review';

const DELIVERY_SLOTS = [
  { id: 'today', label: 'Today', sub: 'Between 2PM – 6PM', fee: 9.99, badge: 'Express' },
  { id: 'tomorrow', label: 'Tomorrow AM', sub: 'Between 9AM – 1PM', fee: 0, badge: 'Standard' },
  { id: 'tomorrow_pm', label: 'Tomorrow PM', sub: 'Between 2PM – 6PM', fee: 0, badge: null },
  { id: 'day3', label: 'In 2 days', sub: 'Between 9AM – 1PM', fee: 0, badge: null },
];

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('address');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [deliverySlot, setDeliverySlot] = useState('tomorrow');
  const [orderNote, setOrderNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; label: string; first_name: string; last_name: string; phone: string; address_line1: string; address_line2: string; suburb: string; state: string; postcode: string; delivery_notes: string; is_default: boolean }>>([]);
  const [address, setAddress] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address_line1: '', address_line2: '', suburb: '',
    state: 'NSW', postcode: '', delivery_notes: '',
  });

  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const activeItems = items.filter(i => !i.saved_for_later);
  const selectedSlot = DELIVERY_SLOTS.find(s => s.id === deliverySlot);
  const slotFee = selectedSlot?.fee ?? 0;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? slotFee : Math.max(slotFee, DELIVERY_FEE);
  const gstAmount = subtotal * GST_RATE;
  const total = subtotal + deliveryFee + gstAmount;

  // Load saved addresses and pre-fill default on mount
  useEffect(() => {
    if (!user) { setAddressLoading(false); return; }
    const load = async () => {
      const [{ data: addrs }, { data: profile }] = await Promise.all([
        supabase.from('customer_addresses').select('id, label, first_name, last_name, phone, address_line1, address_line2, suburb, state, postcode, delivery_notes, is_default').eq('user_id', user.id).order('is_default', { ascending: false }).order('created_at'),
        supabase.from('customer_profiles').select('first_name, last_name, phone').eq('user_id', user.id).maybeSingle(),
      ]);
      setSavedAddresses(addrs ?? []);
      const def = (addrs ?? []).find(a => a.is_default) ?? (addrs ?? [])[0];
      if (def) {
        setAddress({
          first_name: def.first_name || profile?.first_name || '',
          last_name: def.last_name || profile?.last_name || '',
          email: user.email ?? '',
          phone: def.phone || profile?.phone || '',
          address_line1: def.address_line1 || '',
          address_line2: def.address_line2 || '',
          suburb: def.suburb || '',
          state: def.state || 'NSW',
          postcode: def.postcode || '',
          delivery_notes: def.delivery_notes || '',
        });
      } else if (profile) {
        setAddress(prev => ({
          ...prev,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: user.email ?? '',
          phone: profile.phone || '',
        }));
      } else {
        setAddress(prev => ({ ...prev, email: user.email ?? '' }));
      }
      setAddressLoading(false);
    };
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const STEPS: Step[] = ['address', 'delivery', 'payment', 'review'];
  const stepIdx = STEPS.indexOf(step);

  const placeOrder = async () => {
    if (!user) return;
    setPlacing(true);

    try {
      const orderNumber = `BZ${Date.now().toString(36).toUpperCase()}`;

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          delivery_address: address,
          contact_email: address.email || user.email,
          contact_phone: address.phone,
          subtotal,
          delivery_fee: deliveryFee,
          gst_amount: gstAmount,
          total_amount: total,
          order_note: orderNote,
          payment_method: paymentMethod,
          payment_gateway: paymentMethod,
          status: 'placed',
          payment_status: 'pending',
        })
        .select('id')
        .single();

      if (error || !order) throw new Error(error?.message ?? 'Failed to create order');

      // Insert order lines
      const lines = activeItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        seller_id: item.product.seller_id ?? null,
        product_name: item.product.name,
        product_image_url: item.product.primary_image ?? '',
        unit_price: item.product.sale_price ?? item.product.price,
        quantity: item.quantity,
        unit_type: item.unit_type,
        line_total: (item.product.sale_price ?? item.product.price) * item.quantity,
        gst_rate: GST_RATE * 100,
        gst_amount: (item.product.sale_price ?? item.product.price) * item.quantity * GST_RATE,
        status: 'pending',
      }));

      await supabase.from('order_lines').insert(lines);

      // Insert initial tracking event
      await supabase.from('order_tracking_events').insert({
        order_id: order.id,
        status: 'placed',
        message: 'Your order has been placed successfully!',
        updated_by: user.id,
        is_customer_visible: true,
      });

      setOrderPlaced(true);
      await clearCart();
      router.push(`/account/orders/${order.id}?success=true`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast({ title: 'Order failed', description: msg, variant: 'destructive' });
    } finally {
      setPlacing(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to checkout</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Create a free account or sign in to complete your order, track deliveries, and manage your purchases.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login?redirect=/checkout">
              <Button className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold gap-2">
                Sign In to Continue
              </Button>
            </Link>
            <Link href="/auth/register?redirect=/checkout">
              <Button variant="outline" className="w-full h-11 font-semibold gap-2">
                Create Free Account
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Your cart items are saved and will be waiting for you after sign in.
          </p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order placed successfully!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Thank you! We&apos;ll start processing it shortly.
          </p>
          <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 mt-3">Redirecting to your order...</p>
        </div>
      </div>
    );
  }

  if (activeItems.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <Link href="/products">
          <Button className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="container-page max-w-5xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => idx < stepIdx && setStep(s)}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium transition-colors',
                  idx === stepIdx ? 'text-[hsl(var(--primary))]' : idx < stepIdx ? 'text-gray-700 cursor-pointer' : 'text-gray-400'
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  idx === stepIdx ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white' :
                  idx < stepIdx ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white' :
                  'border-gray-300 text-gray-400'
                )}>
                  {idx < stepIdx ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </span>
                <span className="hidden sm:inline capitalize">{s}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={cn('h-px flex-1 min-w-8 transition-colors', idx < stepIdx ? 'bg-[hsl(var(--primary))]' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">

            {/* Step: Address */}
            {step === 'address' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[hsl(var(--primary))]" /> Delivery Address
                </h2>

                {/* Saved address selector */}
                {!addressLoading && savedAddresses.length > 0 && (
                  <div className="mb-5">
                    <p className="text-sm font-medium text-gray-700 mb-2">Saved Addresses</p>
                    <div className="space-y-2">
                      {savedAddresses.map(addr => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => setAddress({
                            first_name: addr.first_name || '',
                            last_name: addr.last_name || '',
                            email: user?.email ?? address.email,
                            phone: addr.phone || '',
                            address_line1: addr.address_line1 || '',
                            address_line2: addr.address_line2 || '',
                            suburb: addr.suburb || '',
                            state: addr.state || 'NSW',
                            postcode: addr.postcode || '',
                            delivery_notes: addr.delivery_notes || '',
                          })}
                          className={cn(
                            'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all',
                            addr.address_line1 === address.address_line1 && addr.suburb === address.suburb
                              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))]'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{addr.label || 'Address'}</span>
                            {addr.is_default && (
                              <span className="text-[10px] font-bold bg-[hsl(var(--primary))] text-white px-1.5 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          <p className="text-gray-500 mt-0.5">{addr.address_line1}, {addr.suburb} {addr.state} {addr.postcode}</p>
                        </button>
                      ))}
                    </div>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                      <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or enter a new address</span></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">First Name</Label>
                    <Input className="mt-1.5 h-10" value={address.first_name} onChange={e => setAddress(p => ({...p, first_name: e.target.value}))} required />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Name</Label>
                    <Input className="mt-1.5 h-10" value={address.last_name} onChange={e => setAddress(p => ({...p, last_name: e.target.value}))} required />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Email Address <span className="text-red-500">*</span></Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input className="pl-9 h-10" type="email" placeholder="you@example.com" value={address.email} onChange={e => setAddress(p => ({...p, email: e.target.value}))} required />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></Label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input className="pl-9 h-10" type="tel" placeholder="+61 4xx xxx xxx" value={address.phone} onChange={e => setAddress(p => ({...p, phone: e.target.value}))} required />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Address Line 1</Label>
                    <Input className="mt-1.5 h-10" placeholder="Street number and name" value={address.address_line1} onChange={e => setAddress(p => ({...p, address_line1: e.target.value}))} required />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Address Line 2 (optional)</Label>
                    <Input className="mt-1.5 h-10" placeholder="Apartment, unit, suite..." value={address.address_line2} onChange={e => setAddress(p => ({...p, address_line2: e.target.value}))} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Suburb</Label>
                    <Input className="mt-1.5 h-10" value={address.suburb} onChange={e => setAddress(p => ({...p, suburb: e.target.value}))} required />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">State</Label>
                    <select
                      value={address.state}
                      onChange={e => setAddress(p => ({...p, state: e.target.value}))}
                      className="w-full mt-1.5 h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    >
                      {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Postcode</Label>
                    <Input className="mt-1.5 h-10" maxLength={4} value={address.postcode} onChange={e => setAddress(p => ({...p, postcode: e.target.value}))} required />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Delivery Notes (optional)</Label>
                    <Input className="mt-1.5 h-10" placeholder="Gate code, leave at door, etc." value={address.delivery_notes} onChange={e => setAddress(p => ({...p, delivery_notes: e.target.value}))} />
                  </div>
                </div>
                <Button
                  onClick={() => setStep('delivery')}
                  className="mt-5 w-full bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white h-11 gap-2 font-semibold"
                  disabled={!address.first_name || !address.email || !address.phone || !address.address_line1 || !address.suburb || !address.postcode}
                >
                  Continue to Delivery <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step: Delivery */}
            {step === 'delivery' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[hsl(var(--primary))]" /> Delivery Slot
                </h2>
                {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                  <p className="text-xs text-[hsl(var(--primary))] font-medium mb-4 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Free standard delivery on your order
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mb-4">
                    Standard delivery ${DELIVERY_FEE.toFixed(2)} · Free over ${FREE_DELIVERY_THRESHOLD}
                  </p>
                )}
                <RadioGroup value={deliverySlot} onValueChange={setDeliverySlot} className="space-y-3">
                  {DELIVERY_SLOTS.map(slot => (
                    <label
                      key={slot.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                        deliverySlot === slot.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))]' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <RadioGroupItem value={slot.id} className="text-[hsl(var(--primary))]" />
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{slot.label}</span>
                          {slot.badge && (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded">{slot.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{slot.sub}</p>
                      </div>
                      <span className={cn('text-sm font-semibold', slot.fee === 0 && subtotal >= FREE_DELIVERY_THRESHOLD ? 'text-[hsl(var(--primary))]' : slot.fee === 0 ? 'text-gray-600' : 'text-gray-700')}>
                        {slot.fee === 0
                          ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 'Free' : `$${DELIVERY_FEE.toFixed(2)}`)
                          : `$${slot.fee.toFixed(2)}`}
                      </span>
                    </label>
                  ))}
                </RadioGroup>

                <div className="mt-4">
                  <Label className="text-sm font-medium">Order Note (optional)</Label>
                  <Textarea
                    className="mt-1.5 text-sm"
                    placeholder="Any special instructions for your order..."
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 mt-5">
                  <Button variant="outline" onClick={() => setStep('address')} className="flex-1 h-11">Back</Button>
                  <Button
                    onClick={() => setStep('payment')}
                    className="flex-1 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white h-11 gap-2 font-semibold"
                  >
                    Continue to Payment <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Payment */}
            {step === 'payment' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[hsl(var(--primary))]" /> Payment Method
                </h2>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  {[
                    { value: 'stripe', label: 'Credit/Debit Card', sub: 'Visa, Mastercard, Amex', icon: '💳' },
                    { value: 'paypal', label: 'PayPal', sub: 'Fast and secure checkout', icon: '🅿' },
                    { value: 'afterpay', label: 'Afterpay', sub: 'Pay in 4 interest-free installments', icon: '📱' },
                  ].map(method => (
                    <label
                      key={method.value}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                        paymentMethod === method.value ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))]' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <RadioGroupItem value={method.value} className="text-[hsl(var(--primary))]" />
                      <span className="text-xl">{method.icon}</span>
                      <div className="flex-1">
                        <span className="font-semibold text-sm">{method.label}</span>
                        <p className="text-xs text-muted-foreground">{method.sub}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                {paymentMethod === 'stripe' && (
                  <div className="mt-5 p-4 bg-gray-50 rounded-xl border">
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
                      <Shield className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                      Secure card processing by Stripe. Your card details are never stored.
                    </p>
                    <div className="space-y-3">
                      <Input placeholder="Card number" className="h-10 text-sm" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="MM / YY" className="h-10 text-sm" />
                        <Input placeholder="CVV" className="h-10 text-sm" />
                      </div>
                      <Input placeholder="Name on card" className="h-10 text-sm" />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Payment integration requires Stripe/PayPal API keys to be configured.
                </div>

                <div className="flex gap-3 mt-5">
                  <Button variant="outline" onClick={() => setStep('delivery')} className="flex-1 h-11">Back</Button>
                  <Button
                    onClick={() => setStep('review')}
                    className="flex-1 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white h-11 gap-2 font-semibold"
                  >
                    Review Order <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Review */}
            {step === 'review' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-5">Review Your Order</h2>

                <div className="space-y-3 mb-5">
                  <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">{address.first_name} {address.last_name}</p>
                      <p className="text-muted-foreground">{address.email}</p>
                      <p className="text-muted-foreground">{address.phone}</p>
                      <p className="text-muted-foreground">{address.address_line1}, {address.suburb} {address.state} {address.postcode}</p>
                      <button onClick={() => setStep('address')} className="text-[hsl(var(--primary))] text-xs hover:underline mt-0.5">Change</button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
                    <Clock className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">{selectedSlot?.label} — {selectedSlot?.sub}</p>
                      <button onClick={() => setStep('delivery')} className="text-[hsl(var(--primary))] text-xs hover:underline mt-0.5">Change</button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
                    <CreditCard className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold capitalize">{paymentMethod}</p>
                      <button onClick={() => setStep('payment')} className="text-[hsl(var(--primary))] text-xs hover:underline mt-0.5">Change</button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full h-12 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-bold text-base gap-2 shadow-lg"
                >
                  {placing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Placing order...
                    </span>
                  ) : (
                    <>Place Order — ${total.toFixed(2)}</>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  By placing your order you agree to our Terms of Service
                </p>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm h-fit lg:sticky lg:top-24">
            <h3 className="font-bold mb-4">Your Order ({activeItems.length})</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {activeItems.map(item => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <span className="w-5 h-5 bg-[hsl(var(--primary))] text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {item.quantity}
                  </span>
                  <span className="flex-1 text-gray-700 line-clamp-2">{item.product.name}</span>
                  <span className="font-medium flex-shrink-0">${((item.product.sale_price ?? item.product.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span className={deliveryFee === 0 ? 'text-[hsl(var(--primary))] font-medium' : ''}>
                  {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST</span><span>${gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span className="text-[hsl(var(--primary))]">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
