'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Package, MapPin, Clock, CircleCheck as CheckCircle2, Truck, ChevronLeft, Printer, Headphones as HeadphonesIcon, RotateCcw, CreditCard, ShoppingBag, RefreshCw, Navigation, Tag, Mail, Phone, Circle as XCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TRACKING_STEPS = [
  { status: 'placed',            label: 'Order Placed',       icon: ShoppingBag,   eta: 'Received' },
  { status: 'payment_confirmed', label: 'Payment Confirmed',  icon: CreditCard,    eta: 'Confirmed' },
  { status: 'picking',           label: 'Picking',            icon: Package,       eta: '~2 hrs' },
  { status: 'packing',           label: 'Packing',            icon: Package,       eta: '~1 hr' },
  { status: 'dispatch_ready',    label: 'Ready to Dispatch',  icon: Package,       eta: '~30 min' },
  { status: 'out_for_delivery',  label: 'Out for Delivery',   icon: Truck,         eta: '~1–2 hrs' },
  { status: 'delivered',         label: 'Delivered',          icon: CheckCircle2,  eta: 'Done' },
];

const STATUS_COLORS: Record<string, string> = {
  placed:            'text-blue-700 bg-blue-50 border-blue-200',
  payment_confirmed: 'text-green-700 bg-green-50 border-green-200',
  picking:           'text-yellow-700 bg-yellow-50 border-yellow-200',
  packing:           'text-yellow-700 bg-yellow-50 border-yellow-200',
  dispatch_ready:    'text-orange-600 bg-orange-50 border-orange-200',
  out_for_delivery:  'text-orange-700 bg-orange-100 border-orange-300',
  delivered:         'text-green-800 bg-green-100 border-green-300',
  cancelled:         'text-red-700 bg-red-50 border-red-200',
};

function getETA(status: string): { label: string; detail: string } {
  const map: Record<string, { label: string; detail: string }> = {
    placed:            { label: 'Processing your order', detail: 'Usually confirmed within 30 minutes' },
    payment_confirmed: { label: 'Payment received', detail: 'Your order is being prepared' },
    picking:           { label: 'Staff are picking your items', detail: 'Estimated completion in ~2 hours' },
    packing:           { label: 'Items being packed', detail: 'Almost ready to dispatch' },
    dispatch_ready:    { label: 'Ready for courier pickup', detail: 'Driver will collect shortly' },
    out_for_delivery:  { label: 'Your order is on its way!', detail: 'Estimated delivery in 1–2 hours' },
    delivered:         { label: 'Delivered successfully', detail: 'Enjoy your order!' },
    cancelled:         { label: 'Order cancelled', detail: 'Contact support if you need assistance' },
  };
  return map[status] ?? { label: 'Processing', detail: 'We\'ll update you soon' };
}

// Consolidate order lines by product_id, summing quantity and line_total
function consolidateLines(lines: Record<string, unknown>[]): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const line of lines) {
    const pid = line.product_id as string;
    if (map.has(pid)) {
      const existing = map.get(pid)!;
      map.set(pid, {
        ...existing,
        quantity: (existing.quantity as number) + (line.quantity as number),
        line_total: (existing.line_total as number) + (line.line_total as number),
      });
    } else {
      map.set(pid, { ...line });
    }
  }
  return Array.from(map.values());
}

function PrintInvoice({ order, lines }: { order: Record<string, unknown>; lines: Record<string, unknown>[] }) {
  const addr = order.delivery_address as Record<string, string>;
  const orderDate = new Date(order.created_at as string);
  const subtotal = order.subtotal as number;
  const gst = order.gst_amount as number;
  const deliveryFee = order.delivery_fee as number;
  const discount = order.discount_amount as number;
  const total = order.total_amount as number;

  return (
    <div className="hidden print:block font-sans text-sm text-gray-900 p-8 max-w-[210mm] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">BAAZAR</h1>
          <p className="text-xs text-gray-500 mt-1">South Asian Grocery Online</p>
          <p className="text-xs text-gray-500">ABN: 12 345 678 901</p>
          <p className="text-xs text-gray-500">support@baazar.com.au</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800 mb-1">TAX INVOICE</h2>
          <p className="text-xs text-gray-500">Invoice #: {order.order_number as string}</p>
          <p className="text-xs text-gray-500">Date: {orderDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-gray-500">Time: {orderDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Bill to */}
      {addr && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Bill To</h3>
          <p className="font-semibold">{addr.first_name} {addr.last_name}</p>
          {(addr.email || (order.contact_email as string)) && <p className="text-gray-600">{addr.email || (order.contact_email as string)}</p>}
          {(addr.phone || (order.contact_phone as string)) && <p className="text-gray-600">{addr.phone || (order.contact_phone as string)}</p>}
          <p className="text-gray-600">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</p>
          <p className="text-gray-600">{addr.suburb} {addr.state} {addr.postcode}</p>
        </div>
      )}

      {/* Line items table */}
      <table className="w-full mb-6 text-xs">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-2 text-left font-bold text-gray-700">Description</th>
            <th className="py-2 text-right font-bold text-gray-700 w-16">Qty</th>
            <th className="py-2 text-right font-bold text-gray-700 w-24">Unit Price</th>
            <th className="py-2 text-right font-bold text-gray-700 w-24">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.product_id as string} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">{line.product_name as string}</td>
              <td className="py-2 text-right text-gray-700">{line.quantity as number}</td>
              <td className="py-2 text-right text-gray-700">${(line.unit_price as number).toFixed(2)}</td>
              <td className="py-2 text-right text-gray-700">${(line.line_total as number).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (incl. GST)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Delivery</span>
            <span>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-gray-600 border-t pt-1.5">
            <span>GST Included (10%)</span>
            <span>${gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t pt-2">
            <span>Total (AUD)</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 pt-4 text-center text-xs text-gray-400 space-y-1">
        <p>Thank you for shopping at Baazar!</p>
        <p>This is a tax invoice for GST purposes. ABN: 12 345 678 901 · Registered for GST.</p>
        <p>For questions or returns, contact support@baazar.com.au or visit baazar.com.au/help</p>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<Record<string, unknown>[]>([]);
  const [tracking, setTracking] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [orderRes, linesRes, trackingRes] = await Promise.all([
      supabase.from('orders').select('*, delivery_failure_note, delivery_driver_accounts(first_name, last_name, phone, vehicle_type, vehicle_rego)').eq('id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('order_lines').select('*').eq('order_id', id).order('created_at'),
      supabase.from('order_tracking_events')
        .select('*').eq('order_id', id).eq('is_customer_visible', true).order('created_at'),
    ]);

    if (!orderRes.data && !silent) { router.push('/account/orders'); return; }
    if (orderRes.data) setOrder(orderRes.data);
    setLines(linesRes.data ?? []);
    setTracking(trackingRes.data ?? []);
    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [id, user, supabase, router]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const cancelOrder = async () => {
    if (!user || !order) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) {
      await supabase.from('order_tracking_events').insert({
        order_id: id,
        status: 'cancelled',
        message: 'Order cancelled by customer.',
        updated_by: user.id,
        is_customer_visible: true,
      });
      await fetchOrder(true);
    }
    setCancelling(false);
  };

  // Auto-refresh every 60s for active orders
  useEffect(() => {
    if (!order) return;
    const activeStatuses = ['placed', 'payment_confirmed', 'picking', 'packing', 'dispatch_ready', 'out_for_delivery'];
    if (!activeStatuses.includes(order.status as string)) return;
    const interval = setInterval(() => fetchOrder(true), 60_000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  if (loading || !order) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container-page py-12 max-w-4xl">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStatusIdx = TRACKING_STEPS.findIndex(s => s.status === order.status);
  const currentStep = TRACKING_STEPS[currentStatusIdx];
  const addr = order.delivery_address as Record<string, string>;
  const eta = getETA(order.status as string);
  const isActive = ['placed', 'payment_confirmed', 'picking', 'packing', 'dispatch_ready', 'out_for_delivery'].includes(order.status as string);
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const isCancellable = ['placed', 'payment_confirmed'].includes(order.status as string);
  const latestEvent = tracking.length > 0 ? tracking[tracking.length - 1] : null;

  const consolidatedLines = consolidateLines(lines);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Print invoice — hidden on screen, shown on print */}
      <PrintInvoice order={order} lines={consolidatedLines} />

      <div className="container-page py-6 max-w-4xl print:hidden">

        {/* Success banner */}
        {isSuccess && (
          <div className="mb-6 p-5 bg-[hsl(var(--secondary))] border border-[hsl(var(--primary))]/30 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[hsl(var(--primary))]">Order placed successfully!</p>
              <p className="text-sm text-[hsl(var(--primary))]/80 mt-0.5">Thank you! We&apos;ll start processing it shortly.</p>
            </div>
          </div>
        )}

        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <Link href="/account/orders" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> My Orders
          </Link>
          <div className="flex gap-2 items-center flex-wrap">
            {isActive && (
              <button
                onClick={() => fetchOrder(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                {refreshing ? 'Refreshing...' : `Updated ${Math.floor((Date.now() - lastRefreshed.getTime()) / 1000)}s ago`}
              </button>
            )}
            {isCancellable && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={cancelOrder}
                disabled={cancelling}
              >
                <XCircle className="w-3.5 h-3.5" />
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> Invoice
            </Button>
            <Link href="/account/support">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
                <HeadphonesIcon className="w-3.5 h-3.5" /> Support
              </Button>
            </Link>
          </div>
        </div>

        {/* Order header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{order.order_number as string}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date(order.created_at as string).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span className={cn('ml-auto px-3 py-1 rounded-full text-xs font-semibold border capitalize', STATUS_COLORS[order.status as string] ?? 'text-gray-600 bg-gray-50 border-gray-200')}>
            {(order.status as string).replace(/_/g, ' ')}
          </span>
        </div>

        {/* ── LIVE TRACKING HERO CARD ── */}
        <div className={cn(
          'rounded-2xl border shadow-sm p-5 mb-5',
          isDelivered ? 'bg-green-50 border-green-200' :
          isCancelled ? 'bg-red-50 border-red-200' :
          isActive ? 'bg-white border-[hsl(var(--primary))]/20' : 'bg-white border-gray-100'
        )}>
          <div className="flex items-start gap-4">
            {/* Animated status icon */}
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
              isDelivered ? 'bg-green-100' :
              isCancelled ? 'bg-red-100' :
              isActive ? 'bg-[hsl(var(--secondary))]' : 'bg-gray-100'
            )}>
              {isActive && currentStep ? (
                <div className="relative">
                  <currentStep.icon className={cn('w-7 h-7', isActive && order.status === 'out_for_delivery' ? 'text-orange-600' : 'text-[hsl(var(--primary))]')} />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[hsl(var(--primary))] border-2 border-white animate-pulse" />
                  )}
                </div>
              ) : isDelivered ? (
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              ) : (
                <Package className="w-7 h-7 text-red-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className={cn('font-bold text-base', isDelivered ? 'text-green-700' : isCancelled ? 'text-red-700' : 'text-gray-900')}>
                    {eta.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{eta.detail}</p>
                </div>
                {isActive && currentStep && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Est. remaining</p>
                    <p className="text-lg font-bold text-[hsl(var(--primary))]">{currentStep.eta}</p>
                  </div>
                )}
              </div>

              {/* Latest tracking update */}
              {latestEvent && (
                <div className="mt-3 flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                  <Navigation className="w-3.5 h-3.5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{latestEvent.message as string}</p>
                    {latestEvent.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {latestEvent.location as string}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(latestEvent.created_at as string).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress stepper */}
          {!isCancelled && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-start justify-between overflow-x-auto pb-1 gap-0 min-w-0">
                {TRACKING_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  const StepIcon = step.icon;
                  return (
                    <div key={step.status} className="flex items-start flex-shrink-0">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                          isDone && !isCurrent ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white' :
                          isCurrent ? 'bg-white border-[hsl(var(--primary))] text-[hsl(var(--primary))] shadow-md ring-4 ring-[hsl(var(--primary))]/10' :
                          'bg-white border-gray-200 text-gray-300'
                        )}>
                          {isDone && !isCurrent
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <StepIcon className={cn('w-4 h-4', isCurrent && 'animate-pulse')} />
                          }
                        </div>
                        <span className={cn(
                          'text-[9px] font-medium text-center max-w-[52px] leading-tight',
                          isCurrent ? 'text-[hsl(var(--primary))] font-bold' :
                          isDone ? 'text-[hsl(var(--primary))]/70' : 'text-gray-400'
                        )}>
                          {step.label}
                        </span>
                        {isCurrent && isActive && (
                          <span className="text-[8px] text-[hsl(var(--primary))] font-bold bg-[hsl(var(--secondary))] px-1.5 rounded-full">NOW</span>
                        )}
                      </div>
                      {idx < TRACKING_STEPS.length - 1 && (
                        <div className={cn(
                          'h-0.5 w-6 sm:w-8 mx-0.5 mt-4 flex-shrink-0 transition-all duration-500',
                          isDone && idx < currentStatusIdx ? 'bg-[hsl(var(--primary))]' : 'bg-gray-200'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── DELIVERY FAILURE NOTE ── */}
        {order.status === 'failed_delivery' && (order as Record<string, unknown>).delivery_failure_note && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-700 text-sm mb-1">Delivery Attempt Failed</p>
              <p className="text-sm text-red-600 leading-relaxed">{(order as Record<string, unknown>).delivery_failure_note as string}</p>
              <p className="text-xs text-red-400 mt-2">Please contact support if you need to reschedule your delivery.</p>
            </div>
          </div>
        )}

        {/* ── FULL TRACKING TIMELINE ── */}
        {tracking.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[hsl(var(--primary))]" /> Full Tracking History
            </h2>
            <div className="space-y-0">
              {[...tracking].reverse().map((event, idx, arr) => {
                const isFirst = idx === 0;
                return (
                  <div key={event.id as string} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 border-2',
                        isFirst ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]' : 'bg-white border-gray-300'
                      )} />
                      {idx < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className={cn('pb-4 flex-1 min-w-0', idx === arr.length - 1 && 'pb-0')}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className={cn('text-sm font-semibold capitalize', isFirst ? 'text-gray-900' : 'text-gray-600')}>
                            {(event.status as string).replace(/_/g, ' ')}
                          </p>
                          <p className={cn('text-xs mt-0.5', isFirst ? 'text-gray-700' : 'text-muted-foreground')}>
                            {event.message as string}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {event.location as string}
                            </p>
                          )}
                        </div>
                        <p className={cn('text-[10px] flex-shrink-0', isFirst ? 'text-[hsl(var(--primary))] font-medium' : 'text-gray-400')}>
                          {new Date(event.created_at as string).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Driver info — shown once out for delivery */}
        {['out_for_delivery', 'nearby', 'delivered'].includes(order.status as string) && (order as Record<string, unknown>).delivery_driver_accounts && (
          <div className="bg-white rounded-2xl border border-[hsl(var(--primary))]/20 shadow-sm p-5 mb-5">
            <h2 className="font-bold mb-3 flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-[hsl(var(--primary))]" /> Your Delivery Driver
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6 text-[hsl(var(--primary))]" />
              </div>
              <div className="flex-1 min-w-0">
                {(() => {
                  const d = (order as Record<string, unknown>).delivery_driver_accounts as Record<string, string>;
                  return (
                    <>
                      <p className="font-semibold text-gray-900">{d.first_name} {d.last_name}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {d.vehicle_type}{d.vehicle_rego ? ` · ${d.vehicle_rego}` : ''}
                      </p>
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className="flex items-center gap-1.5 text-sm text-[hsl(var(--primary))] font-medium mt-1.5 hover:underline">
                          <Phone className="w-3.5 h-3.5" /> {d.phone}
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Delivery address */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" /> Delivery Address
            </h2>
            {addr ? (
              <div className="text-sm space-y-1 text-gray-700">
                <p className="font-semibold">{addr.first_name} {addr.last_name}</p>
                {(addr.email || (order.contact_email as string)) && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    {addr.email || (order.contact_email as string)}
                  </p>
                )}
                {(addr.phone || (order.contact_phone as string)) && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {addr.phone || (order.contact_phone as string)}
                  </p>
                )}
                <p>{addr.address_line1}</p>
                {addr.address_line2 && <p>{addr.address_line2}</p>}
                <p>{addr.suburb} {addr.state} {addr.postcode}</p>
                {addr.delivery_notes && (
                  <p className="mt-2 text-muted-foreground italic text-xs border-t pt-2">{addr.delivery_notes}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No address on file</p>
            )}
          </div>

          {/* Payment summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-[hsl(var(--primary))]" /> Payment Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${(order.subtotal as number).toFixed(2)}</span>
              </div>
              {(order.discount_amount as number) > 0 && (
                <div className="flex justify-between text-[hsl(var(--primary))]">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Discount</span>
                  <span>-${(order.discount_amount as number).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className={(order.delivery_fee as number) === 0 ? 'text-[hsl(var(--primary))] font-medium' : ''}>
                  {(order.delivery_fee as number) === 0 ? 'Free' : `$${(order.delivery_fee as number).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (10% incl.)</span>
                <span>${(order.gst_amount as number).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-base">
                <span>Total</span>
                <span className="text-[hsl(var(--primary))]">${(order.total_amount as number).toFixed(2)}</span>
              </div>
              <div className="pt-1">
                <span className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                  order.payment_status === 'paid' ? 'text-green-700 bg-green-50 border-green-200' : 'text-blue-700 bg-blue-50 border-blue-200'
                )}>
                  {(order.payment_status as string).charAt(0).toUpperCase() + (order.payment_status as string).slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-[hsl(var(--primary))]" /> Order Items ({consolidatedLines.length})
            </h2>
          </div>
          {consolidatedLines.map(line => (
            <div key={line.product_id as string} className="flex gap-4 p-4 border-b last:border-0">
              <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                {line.product_image_url ? (
                  <Image src={line.product_image_url as string} alt={line.product_name as string} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{line.product_name as string}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(line.quantity as number)} × ${(line.unit_price as number).toFixed(2)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-[hsl(var(--primary))]">${(line.line_total as number).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {isCancellable && (
            <Button
              variant="outline"
              className="gap-2 text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={cancelOrder}
              disabled={cancelling}
            >
              <XCircle className="w-4 h-4" />
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
          {isDelivered && (
            <>
              <Link href={`/account/support?order=${order.order_number as string}&type=refund`}>
                <Button variant="outline" className="gap-2 text-sm">
                  <RotateCcw className="w-4 h-4" /> Request Return/Refund
                </Button>
              </Link>
              <Link href="/products">
                <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm">
                  <Package className="w-4 h-4" /> Buy Again
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
