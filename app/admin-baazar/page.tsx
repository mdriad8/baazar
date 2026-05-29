'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingBag, Store, Megaphone, DollarSign, Bell, RefreshCcw, ArrowUpRight, Activity, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalSellers: number;
  totalProducts: number;
  pendingApprovals: number;
  pendingAds: number;
  pendingRefunds: number;
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: 'text-blue-600 bg-blue-50',
  payment_confirmed: 'text-green-600 bg-green-50',
  picking: 'text-yellow-600 bg-yellow-50',
  out_for_delivery: 'text-orange-600 bg-orange-50',
  delivered: 'text-green-700 bg-green-100',
  cancelled: 'text-red-600 bg-red-50',
};

export default function AdminBaazarDashboard() {
  const { checking } = useAdmin();
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalSellers: 0, totalProducts: 0, pendingApprovals: 0, pendingAds: 0, pendingRefunds: 0 });
  const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (checking) return;
    const fetchStats = async () => {
      const [ordersRes, productsRes, sellersRes, adsRes, refundsRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status'),
        supabase.from('products').select('id, status'),
        supabase.from('seller_profiles').select('id, status'),
        supabase.from('campaigns').select('id').eq('admin_approval_status', 'pending'),
        supabase.from('refunds').select('id').eq('status', 'pending'),
      ]);
      const orders = ordersRes.data ?? [];
      const products = productsRes.data ?? [];
      const sellers = sellersRes.data ?? [];
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter((o: Record<string, unknown>) => ['placed', 'payment_confirmed', 'picking', 'packing'].includes(o.status as string)).length,
        totalRevenue: orders.reduce((s: number, o: Record<string, unknown>) => s + (o.total_amount as number || 0), 0),
        totalSellers: sellers.filter((s: Record<string, unknown>) => s.status === 'active').length,
        totalProducts: products.filter((p: Record<string, unknown>) => p.status === 'published').length,
        pendingApprovals: products.filter((p: Record<string, unknown>) => p.status === 'pending_admin_approval').length,
        pendingAds: adsRes.data?.length ?? 0,
        pendingRefunds: refundsRes.data?.length ?? 0,
      });
      const [ordersRecent, pendingProds] = await Promise.all([
        supabase.from('orders').select('id, order_number, total_amount, status, created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('products').select('id, name, price, created_at, seller_profiles(display_name)').eq('status', 'pending_admin_approval').limit(5),
      ]);
      setRecentOrders(ordersRecent.data ?? []);
      setPendingProducts(pendingProds.data ?? []);
    };
    fetchStats();
  }, [checking, supabase]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const STAT_CARDS = [
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12%' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+8%' },
    { label: 'Active Sellers', value: stats.totalSellers, icon: Store, color: 'text-orange-600', bg: 'bg-orange-50', trend: '+3' },
    { label: 'Published Products', value: stats.totalProducts, icon: Package, color: 'text-teal-600', bg: 'bg-teal-50', trend: '+15' },
  ];

  const ALERT_ITEMS = [
    { label: 'Pending Product Approvals', count: stats.pendingApprovals, href: '/admin-baazar/product-approvals', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Package },
    { label: 'Pending Ad Approvals', count: stats.pendingAds, href: '/admin-baazar/ads', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Megaphone },
    { label: 'Pending Refunds', count: stats.pendingRefunds, href: '/admin-baazar/refunds', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: RefreshCcw },
    { label: 'Active Orders', count: stats.pendingOrders, href: '/admin-baazar/orders', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: ShoppingBag },
  ];

  const dateLabel = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AdminBaazarShell
      title="Admin Dashboard"
      subtitle={dateLabel}
      headerRight={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 hidden sm:flex">
            <Activity className="w-3.5 h-3.5" /> Live View
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-xs font-semibold text-green-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />{stat.trend}
                </span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALERT_ITEMS.map(alert => (
            <Link key={alert.label} href={alert.href}
              className={cn('p-4 rounded-xl border flex items-center gap-3 hover:shadow-md transition-all', alert.bg)}>
              <alert.icon className={`w-8 h-8 ${alert.color} flex-shrink-0`} />
              <div className="min-w-0">
                <div className={`text-2xl font-bold ${alert.color}`}>{alert.count}</div>
                <div className="text-xs text-gray-600 leading-tight">{alert.label}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-sm">Recent Orders</h2>
              <Link href="/admin-baazar/orders" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No orders yet</div>
              ) : recentOrders.map(order => {
                const statusColor = ORDER_STATUS_COLORS[order.status as string] ?? 'text-gray-600 bg-gray-50';
                return (
                  <div key={order.id as string} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{order.order_number as string}</span>
                        <span className={cn('status-badge text-[10px]', statusColor)}>{(order.status as string).replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(order.created_at as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">${(order.total_amount as number).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Product Approvals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-sm">Pending Product Approvals</h2>
              <Link href="/admin-baazar/product-approvals" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                Review All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {pendingProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingProducts.map(product => {
                  const seller = product.seller_profiles as Record<string, unknown> | null;
                  return (
                    <div key={product.id as string} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{product.name as string}</p>
                        <p className="text-[10px] text-muted-foreground">{seller?.display_name as string ?? 'Unknown'} · ${(product.price as number).toFixed(2)}</p>
                      </div>
                      <Link href="/admin-baazar/product-approvals" className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium hover:bg-amber-100 transition-colors flex-shrink-0">
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
