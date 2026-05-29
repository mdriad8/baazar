'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Package, Clock, ChevronRight, Search, Truck, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AccountLayout from '@/components/account/AccountLayout';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_address: Record<string, string>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  placed: { label: 'Order Placed', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  payment_confirmed: { label: 'Confirmed', color: 'text-green-600 bg-green-50 border-green-200' },
  stock_allocated: { label: 'Processing', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  picking: { label: 'Picking', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  packing: { label: 'Packing', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  dispatch_ready: { label: 'Ready to Dispatch', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  nearby: { label: 'Driver Nearby', color: 'text-orange-700 bg-orange-100 border-orange-300' },
  delivered: { label: 'Delivered', color: 'text-green-700 bg-green-100 border-green-300' },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50 border-red-200' },
  refund_processed: { label: 'Refunded', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const FILTER_TABS = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['placed', 'payment_authorised', 'payment_confirmed', 'stock_allocated', 'picking', 'packing', 'qc_ready', 'dispatch_ready', 'out_for_delivery', 'nearby'];

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, created_at, delivery_address')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();
  }, [user, supabase]);

  if (loading) return (
    <AccountLayout>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-20" />
        ))}
      </div>
    </AccountLayout>
  );
  if (!user) return null;

  const filtered = orders
    .filter(o => {
      if (filter === 'active') return ACTIVE_STATUSES.includes(o.status);
      if (filter === 'delivered') return o.status === 'delivered';
      if (filter === 'cancelled') return ['cancelled', 'refund_processed'].includes(o.status);
      return true;
    })
    .filter(o => !search || o.order_number.toLowerCase().includes(search.toLowerCase()));

  return (
    <AccountLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} total orders</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  filter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try a different search term' : 'You have no orders in this category'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.placed;
              const addr = order.delivery_address as Record<string, string>;
              const isActive = ACTIVE_STATUSES.includes(order.status);

              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{order.order_number}</span>
                          <span className={cn('status-badge border text-[10px]', statusConf.color)}>
                            {statusConf.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {addr?.suburb && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {addr.suburb}, {addr.state}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[hsl(var(--primary))] text-base">${order.total_amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{order.payment_status}</p>
                      </div>
                    </div>

                    {isActive && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-[hsl(var(--primary))] font-medium">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track your order</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
