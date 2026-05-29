'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, ChevronUp, MapPin, Package, Truck, CircleCheck as CheckCircle2, CreditCard, ShoppingBag, Clock, Mail, Phone, User, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TrackingEvent {
  id: string;
  status: string;
  message: string;
  location: string | null;
  created_at: string;
}

interface OrderLine {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface DriverInfo {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  vehicle_type: string;
  vehicle_rego: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  gst_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_address: Record<string, string> | null;
  contact_email: string | null;
  contact_phone: string | null;
  driver_id: string | null;
  delivery_driver_accounts: DriverInfo | null;
  delivery_failure_note: string | null;
}

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: ShoppingBag, color: 'text-blue-600' },
  { key: 'payment_confirmed', label: 'Payment Confirmed', icon: CreditCard, color: 'text-green-600' },
  { key: 'picking', label: 'Picking', icon: Package, color: 'text-yellow-600' },
  { key: 'packing', label: 'Packing', icon: Package, color: 'text-yellow-600' },
  { key: 'dispatch_ready', label: 'Ready to Dispatch', icon: Package, color: 'text-orange-500' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'text-orange-600' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600' },
];

const STATUS_COLORS: Record<string, string> = {
  placed: 'text-blue-700 bg-blue-50 border-blue-200',
  payment_confirmed: 'text-green-700 bg-green-50 border-green-200',
  picking: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  packing: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  dispatch_ready: 'text-orange-600 bg-orange-50 border-orange-200',
  out_for_delivery: 'text-orange-700 bg-orange-50 border-orange-200',
  delivered: 'text-green-800 bg-green-100 border-green-300',
  cancelled: 'text-red-700 bg-red-50 border-red-200',
};

const TRACK_MESSAGES: Record<string, string> = {
  placed: 'Order has been placed and is awaiting confirmation.',
  payment_confirmed: 'Payment confirmed. Order is being processed.',
  picking: 'Staff are picking your items from the warehouse.',
  packing: 'Items are being packed and prepared for dispatch.',
  dispatch_ready: 'Order is ready and waiting for courier pickup.',
  out_for_delivery: 'Order is out for delivery with our driver.',
  delivered: 'Order has been successfully delivered.',
  cancelled: 'Order has been cancelled.',
};

const STATUSES = ['all', 'placed', 'payment_confirmed', 'picking', 'packing', 'dispatch_ready', 'out_for_delivery', 'delivered', 'cancelled'];

export default function AdminBaazarOrdersPage() {
  const { checking } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trackingMap, setTrackingMap] = useState<Record<string, TrackingEvent[]>>({});
  const [linesMap, setLinesMap] = useState<Record<string, OrderLine[]>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('orders')
      .select('id, order_number, total_amount, subtotal, delivery_fee, gst_amount, status, payment_status, created_at, delivery_address, contact_email, contact_phone, driver_id, delivery_failure_note, delivery_driver_accounts(first_name, last_name, phone, email, vehicle_type, vehicle_rego)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setOrders(data ?? []);
    setLoading(false);
  }, [checking, statusFilter, supabase]);

  useEffect(() => { if (!checking) load(); }, [checking, statusFilter]);

  const toggleExpand = async (orderId: string) => {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
    if (!trackingMap[orderId]) {
      const [trackRes, linesRes] = await Promise.all([
        supabase.from('order_tracking_events').select('id, status, message, location, created_at').eq('order_id', orderId).order('created_at'),
        supabase.from('order_lines').select('id, product_name, quantity, unit_price, line_total').eq('order_id', orderId),
      ]);
      setTrackingMap(prev => ({ ...prev, [orderId]: trackRes.data ?? [] }));
      setLinesMap(prev => ({ ...prev, [orderId]: linesRes.data ?? [] }));
    }
  };

  const updateTracking = async (order: Order, newStatus: string) => {
    setUpdating(order.id);
    const message = noteMap[order.id]?.trim() || TRACK_MESSAGES[newStatus] || `Status updated to ${newStatus.replace(/_/g, ' ')}`;
    const location = locationMap[order.id]?.trim() || null;

    const { error: orderErr } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (orderErr) { toast({ title: 'Update failed', description: orderErr.message, variant: 'destructive' }); setUpdating(null); return; }

    await supabase.from('order_tracking_events').insert({
      order_id: order.id,
      status: newStatus,
      message,
      location,
      is_customer_visible: true,
    });

    // Refresh tracking for this order
    const { data } = await supabase.from('order_tracking_events').select('id, status, message, location, created_at').eq('order_id', order.id).order('created_at');
    setTrackingMap(prev => ({ ...prev, [order.id]: data ?? [] }));
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    setNoteMap(prev => ({ ...prev, [order.id]: '' }));
    setLocationMap(prev => ({ ...prev, [order.id]: '' }));
    toast({ title: 'Order tracking updated', description: `Status set to "${newStatus.replace(/_/g, ' ')}"` });
    setUpdating(null);
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = orders.filter(o => !search || o.order_number.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminBaazarShell title="Orders" subtitle={`${orders.length} total orders`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order number..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all',
                statusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-16" />
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-muted-foreground">No orders found</div>
        ) : filtered.map(order => {
          const isOpen = expanded === order.id;
          const addr = order.delivery_address;
          const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleExpand(order.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{order.order_number}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize', STATUS_COLORS[order.status] ?? 'text-gray-600 bg-gray-50 border-gray-200')}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
                      order.payment_status === 'paid' ? 'text-green-700 bg-green-50 border-green-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200')}>
                      {order.payment_status}
                    </span>
                    {order.delivery_driver_accounts && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5" />
                        {order.delivery_driver_accounts.first_name} {order.delivery_driver_accounts.last_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="font-bold text-emerald-600 text-sm flex-shrink-0">${order.total_amount.toFixed(2)}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/30 space-y-5">
                  {/* Tracking progress bar */}
                  {order.status !== 'cancelled' && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Progress</h3>
                      <div className="flex items-center overflow-x-auto pb-1 gap-0">
                        {STATUS_STEPS.map((step, idx) => {
                          const isDone = idx <= currentStepIdx;
                          const isCurrent = idx === currentStepIdx;
                          const StepIcon = step.icon;
                          return (
                            <div key={step.key} className="flex items-center flex-shrink-0">
                              <div className="flex flex-col items-center gap-1">
                                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs',
                                  isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-300')}>
                                  {isCurrent ? <StepIcon className="w-3.5 h-3.5" /> : isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                                </div>
                                <span className={cn('text-[9px] font-medium text-center max-w-[52px] leading-tight', isDone ? 'text-emerald-600' : 'text-gray-400')}>
                                  {step.label}
                                </span>
                              </div>
                              {idx < STATUS_STEPS.length - 1 && (
                                <div className={cn('h-0.5 w-5 sm:w-8 mx-0.5 mb-4 transition-colors flex-shrink-0', isDone && idx < currentStepIdx ? 'bg-emerald-400' : 'bg-gray-200')} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Update tracking */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-emerald-600" /> Update Status</h3>
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">New Status</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {STATUS_STEPS.map(step => (
                              <button
                                key={step.key}
                                disabled={order.status === step.key || updating === order.id}
                                onClick={() => {
                                  if (order.status !== step.key) updateTracking(order, step.key);
                                }}
                                className={cn('text-[11px] px-2 py-1.5 rounded-lg border font-medium transition-all text-left',
                                  order.status === step.key
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-default'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer'
                                )}
                              >
                                {step.label}
                              </button>
                            ))}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <button
                                disabled={updating === order.id}
                                onClick={() => updateTracking(order, 'cancelled')}
                                className="text-[11px] px-2 py-1.5 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 font-medium transition-all col-span-2"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Custom Message (optional)</label>
                          <textarea
                            value={noteMap[order.id] ?? ''}
                            onChange={e => setNoteMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                            rows={2}
                            placeholder="E.g. Your order is with John, ETA 3pm"
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500 mb-1 block">Location (optional)</label>
                          <Input
                            value={locationMap[order.id] ?? ''}
                            onChange={e => setLocationMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder="E.g. Sydney Distribution Centre"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delivery address + driver + order lines */}
                    <div className="space-y-3">
                      {addr && (
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivery Address</h3>
                          <p className="text-xs text-gray-700 font-semibold">{addr.first_name} {addr.last_name}</p>
                          {(order.contact_email || addr.email) && (
                            <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              {order.contact_email || addr.email}
                            </p>
                          )}
                          {(order.contact_phone || addr.phone) && (
                            <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              {order.contact_phone || addr.phone}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">{addr.address_line1}</p>
                          <p className="text-xs text-gray-500">{addr.suburb} {addr.state} {addr.postcode}</p>
                        </div>
                      )}

                      {/* Driver info */}
                      {order.delivery_driver_accounts ? (
                        <div className="bg-white rounded-xl border border-emerald-100 p-4">
                          <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" /> Assigned Driver
                          </h3>
                          <p className="text-xs text-gray-800 font-semibold">
                            {order.delivery_driver_accounts.first_name} {order.delivery_driver_accounts.last_name}
                          </p>
                          {order.delivery_driver_accounts.phone && (
                            <a href={`tel:${order.delivery_driver_accounts.phone}`} className="text-xs text-emerald-600 flex items-center gap-1 mt-1 hover:underline">
                              <Phone className="w-3 h-3 flex-shrink-0" /> {order.delivery_driver_accounts.phone}
                            </a>
                          )}
                          {order.delivery_driver_accounts.email && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 flex-shrink-0" /> {order.delivery_driver_accounts.email}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1 capitalize">
                            {order.delivery_driver_accounts.vehicle_type}
                            {order.delivery_driver_accounts.vehicle_rego ? ` · ${order.delivery_driver_accounts.vehicle_rego}` : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <h3 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-gray-400" /> Driver
                          </h3>
                          <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <User className="w-3 h-3" /> Not yet assigned
                          </p>
                        </div>
                      )}
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-emerald-600" /> Items ({linesMap[order.id]?.length ?? '...'})</h3>
                        <div className="space-y-1.5">
                          {(linesMap[order.id] ?? []).map(line => (
                            <div key={line.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 truncate max-w-[160px]">{line.product_name}</span>
                              <span className="text-gray-500 flex-shrink-0 ml-2">{line.quantity}× ${line.unit_price.toFixed(2)} = <strong>${line.line_total.toFixed(2)}</strong></span>
                            </div>
                          ))}
                          {linesMap[order.id] === undefined && <p className="text-xs text-gray-400">Loading items...</p>}
                        </div>
                        <div className="mt-2 pt-2 border-t text-xs flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-emerald-600">${order.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery failure note */}
                  {order.status === 'failed_delivery' && order.delivery_failure_note && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <MessageSquare className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-700 mb-1">Driver Failure Note</p>
                        <p className="text-xs text-red-600 leading-relaxed">{order.delivery_failure_note}</p>
                      </div>
                    </div>
                  )}

                  {/* Tracking timeline */}
                  {(trackingMap[order.id] ?? []).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-600" /> Tracking History</h3>
                      <div className="space-y-2">
                        {[...trackingMap[order.id]].reverse().map(event => (
                          <div key={event.id} className="flex gap-3">
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1" />
                              <div className="w-px flex-1 bg-gray-200 mt-1" />
                            </div>
                            <div className="pb-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold capitalize text-gray-800">{event.status.replace(/_/g, ' ')}</span>
                                {event.location && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{event.location}</span>}
                              </div>
                              <p className="text-xs text-gray-500">{event.message}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{new Date(event.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminBaazarShell>
  );
}
