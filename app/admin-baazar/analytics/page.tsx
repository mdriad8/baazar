'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { DollarSign, ShoppingBag, Users, Store, TrendingUp, Package, ArrowUp, ArrowDown } from 'lucide-react';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalSellers: number;
  totalProducts: number;
  pendingApprovals: number;
  recentOrders: { id: string; order_number: string; total_amount: number; status: string; created_at: string }[];
  topCategories: { name: string; count: number }[];
}

export default function AnalyticsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0, totalOrders: 0, totalCustomers: 0, totalSellers: 0,
    totalProducts: 0, pendingApprovals: 0, recentOrders: [], topCategories: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const [orders, customers, sellers, products, approvals, recent] = await Promise.all([
        supabase.from('orders').select('total_amount, status'),
        supabase.from('customer_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('seller_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending_admin_approval'),
        supabase.from('orders').select('id, order_number, total_amount, status, created_at').order('created_at', { ascending: false }).limit(8),
      ]);

      const orderRows = orders.data ?? [];
      const revenue = orderRows.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_amount ?? 0), 0);

      setStats({
        totalRevenue: revenue,
        totalOrders: orderRows.length,
        totalCustomers: customers.count ?? 0,
        totalSellers: sellers.count ?? 0,
        totalProducts: products.count ?? 0,
        pendingApprovals: approvals.count ?? 0,
        recentOrders: recent.data ?? [],
        topCategories: [],
      });
      setLoading(false);
    };
    load();
  }, [isAdmin, supabase]);

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const kpis = [
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'All time' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'All time' },
    { label: 'Customers', value: stats.totalCustomers, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', sub: 'Registered' },
    { label: 'Active Sellers', value: stats.totalSellers, icon: Store, color: 'text-orange-600', bg: 'bg-orange-50', sub: 'B2B partners' },
    { label: 'Products Listed', value: stats.totalProducts, icon: Package, color: 'text-teal-600', bg: 'bg-teal-50', sub: 'Total catalogue' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50', sub: 'Needs review' },
  ];

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Analytics" subtitle="Platform overview and key metrics">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${k.bg} rounded-lg flex items-center justify-center`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
              </div>
              {loading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                  <p className="text-xs text-gray-400">{k.sub}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Order #', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : stats.recentOrders.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No orders yet</td></tr>
                ) : stats.recentOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3 font-semibold">${(o.total_amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Order Status Breakdown</h3>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => {
                  const count = stats.recentOrders.filter(o => o.status === status).length;
                  const pct = stats.recentOrders.length > 0 ? (count / stats.recentOrders.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{status}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Platform Health</h3>
            <div className="space-y-3">
              {[
                { label: 'Pending Product Approvals', value: stats.pendingApprovals, alert: stats.pendingApprovals > 0 },
                { label: 'Active Sellers', value: stats.totalSellers, alert: false },
                { label: 'Total Products Listed', value: stats.totalProducts, alert: false },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg ${item.alert ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
                  <span className={`text-sm ${item.alert ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>{item.label}</span>
                  <span className={`font-bold ${item.alert ? 'text-amber-700' : 'text-gray-900'}`}>{loading ? '...' : item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
