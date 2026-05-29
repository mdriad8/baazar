'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, ShoppingBag, TrendingUp, Megaphone, Settings, ChevronRight, Plus, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Clock, DollarSign, ChartBar as BarChart3, Star, Eye, Send, Menu, X, LogOut, ShoppingCart, Hash, Truck, Calendar, ExternalLink, Pencil, ArrowUpDown, Phone, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SellerProfile {
  id: string;
  display_name: string;
  status: string;
  rating_average: number;
  total_products: number;
  total_sales: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  stock_quantity: number;
  view_count: number;
  purchase_count: number;
  rating_average: number;
  rating_count: number;
  created_at: string;
  rejection_reason: string | null;
  pending_edit_rejection_reason: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_failure_note: string | null;
  customer_profiles: { first_name: string; last_name: string } | null;
  delivery_driver_accounts: { first_name: string; last_name: string; phone: string; vehicle_type: string; vehicle_rego: string } | null;
}

interface Campaign {
  id: string;
  name: string;
  placement: string;
  status: string;
  admin_approval_status: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  amount_paid: number;
  impressions: number;
  clicks: number;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-600 bg-gray-50 border-gray-200',
  submitted: 'text-blue-600 bg-blue-50 border-blue-200',
  pending_admin_approval: 'text-amber-600 bg-amber-50 border-amber-200',
  approved: 'text-teal-600 bg-teal-50 border-teal-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
  published: 'text-green-600 bg-green-50 border-green-200',
  hidden: 'text-gray-600 bg-gray-50 border-gray-200',
  suspended: 'text-red-600 bg-red-50 border-red-200',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  placed: 'text-amber-600 bg-amber-50 border-amber-200',
  payment_confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
  payment_authorised: 'text-blue-600 bg-blue-50 border-blue-200',
  stock_allocated: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  picking: 'text-amber-600 bg-amber-50 border-amber-200',
  packing: 'text-amber-600 bg-amber-50 border-amber-200',
  qc_ready: 'text-teal-600 bg-teal-50 border-teal-200',
  dispatch_ready: 'text-teal-600 bg-teal-50 border-teal-200',
  out_for_delivery: 'text-orange-600 bg-orange-50 border-orange-200',
  nearby: 'text-orange-600 bg-orange-50 border-orange-200',
  delivered: 'text-green-600 bg-green-50 border-green-200',
  failed_delivery: 'text-red-600 bg-red-50 border-red-200',
  cancelled: 'text-red-600 bg-red-50 border-red-200',
  refunded: 'text-gray-600 bg-gray-50 border-gray-200',
};

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-600 bg-gray-50 border-gray-200',
  active: 'text-green-700 bg-green-50 border-green-200',
  paused: 'text-amber-600 bg-amber-50 border-amber-200',
  ended: 'text-gray-500 bg-gray-50 border-gray-200',
  pending: 'text-blue-600 bg-blue-50 border-blue-200',
  approved: 'text-teal-600 bg-teal-50 border-teal-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
};

function EmptyState({ icon: Icon, title, desc, action }: {
  icon: React.ElementType; title: string; desc: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <p className="font-semibold text-gray-800 mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function SellerDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeNav, setActiveNav] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [analyticsSort, setAnalyticsSort] = useState<'views' | 'sold' | 'rating'>('views');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/seller-dashboard/login');
  }, [user, loading, router]);

  const fetchSellerData = useCallback(async () => {
    if (!user) return;
    setFetchingData(true);
    const { data: sellerUser } = await supabase
      .from('seller_users')
      .select('seller_id, role, seller_profiles(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sellerUser?.seller_profiles) {
      setFetchingData(false);
      setSeller(null);
      return;
    }

    const sp = sellerUser.seller_profiles as unknown as SellerProfile;
    setSeller(sp);

    const [{ data: prods }, { data: lines }, { data: camps }] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, price, status, stock_quantity, view_count, purchase_count, rating_average, rating_count, created_at, rejection_reason, pending_edit_rejection_reason')
        .eq('seller_id', sp.id)
        .order('created_at', { ascending: false }),
      supabase.from('order_lines').select('order_id').eq('seller_id', sp.id),
      supabase
        .from('campaigns')
        .select('id, name, placement, status, admin_approval_status, start_date, end_date, total_budget, amount_paid, impressions, clicks, created_at')
        .eq('seller_id', sp.id)
        .order('created_at', { ascending: false }),
    ]);

    if (prods) setProducts(prods as Product[]);
    if (camps) setCampaigns(camps as Campaign[]);

    const uniqueOrderIds = [...new Set((lines ?? []).map((l: { order_id: string }) => l.order_id))];
    if (uniqueOrderIds.length > 0) {
      const { data: ords } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, delivery_failure_note, customer_profiles!orders_user_id_fkey_customer_profiles(first_name, last_name), delivery_driver_accounts!orders_driver_id_fkey(first_name, last_name, phone, vehicle_type, vehicle_rego)')
        .in('id', uniqueOrderIds)
        .order('created_at', { ascending: false })
        .limit(100);
      if (ords) setOrders(ords as unknown as Order[]);
    }

    setFetchingData(false);
  }, [user, supabase]);

  useEffect(() => { fetchSellerData(); }, [fetchSellerData]);

  const submitForApproval = async (productId: string) => {
    setSubmitting(productId);
    const { error } = await supabase.from('products')
      .update({ status: 'pending_admin_approval', rejection_reason: null })
      .eq('id', productId);
    if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'pending_admin_approval', rejection_reason: null } : p));
    setSubmitting(null);
  };

  // Loading state — never show "Not a Verified Seller" during initial load
  if (loading || (fetchingData && !seller)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Only show "not a seller" after data has loaded and no seller was found
  if (!fetchingData && !seller) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container-page py-10 sm:py-16 max-w-2xl text-center px-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-10 shadow-sm">
            <Megaphone className="w-14 h-14 text-[hsl(var(--primary))] mx-auto mb-5 opacity-80" />
            <h1 className="text-xl sm:text-2xl font-bold mb-3">Seller Access Required</h1>
            <p className="text-muted-foreground leading-relaxed mb-6 text-sm sm:text-base">
              You don&apos;t have a seller profile yet. Only admin-approved sellers can access the seller dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/seller-apply">
                <Button className="w-full sm:w-auto bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
                  <Send className="w-4 h-4" /> Apply to Sell
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  const pendingApproval = products.filter(p => p.status === 'pending_admin_approval').length;
  const publishedCount = products.filter(p => p.status === 'published').length;
  const rejectedProducts = products.filter(p => p.status === 'rejected');
  const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
  const activeOrders = orders.filter(o => !['delivered', 'failed_delivery', 'cancelled'].includes(o.status)).length;

  // ── SECTIONS ───────────────────────────────────────────────────────────────

  const OverviewSection = () => (
    <div className="space-y-4 sm:space-y-5">
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {seller.display_name}</p>
        </div>
        <Link href="/seller-dashboard/products/new">
          <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </Link>
      </div>

      {/* Alert banners */}
      {pendingApproval > 0 && (
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-700">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{pendingApproval} product{pendingApproval > 1 ? 's' : ''} awaiting admin approval.</span>
        </div>
      )}
      {rejectedProducts.length > 0 && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            {rejectedProducts.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-medium truncate">{p.name}</span>
                {(p.rejection_reason) && (
                  <span className="text-red-500 text-xs">— {p.rejection_reason}</span>
                )}
                <Link href={`/seller-dashboard/products/${p.id}/edit`} className="text-xs font-semibold underline flex-shrink-0">Fix &amp; Resubmit</Link>
              </div>
            ))}
          </div>
        </div>
      )}
      {lowStock > 0 && (
        <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3 text-sm text-orange-700">
          <Package className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{lowStock} product{lowStock > 1 ? 's are' : ' is'} low on stock (5 or fewer remaining).</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Published', value: publishedCount, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', nav: 'products' },
          { label: 'Active Orders', value: activeOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', nav: 'orders' },
          { label: 'Total Sales', value: `$${(seller.total_sales ?? 0).toFixed(0)}`, icon: DollarSign, color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--secondary))]', nav: 'settlements' },
          { label: 'Avg Rating', value: (seller.rating_average ?? 0).toFixed(1), icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', nav: 'analytics' },
        ].map(stat => (
          <button key={stat.label} onClick={() => setActiveNav(stat.nav)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 text-left hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-2 sm:mb-3`}>
              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
            </div>
            <div className={`text-lg sm:text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Quick links row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Manage Products', icon: Package, nav: 'products', href: '/seller-dashboard/products' },
          { label: 'View Orders', icon: ShoppingBag, nav: 'orders', href: null },
          { label: 'Create Ad', icon: Megaphone, nav: null, href: '/seller-dashboard/ads/create' },
          { label: 'Analytics', icon: BarChart3, nav: 'analytics', href: null },
        ].map(item => (
          item.href
            ? <Link key={item.label} href={item.href}
                className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:border-[hsl(var(--primary))]/40 hover:text-[hsl(var(--primary))] hover:shadow-sm transition-all">
                <item.icon className="w-4 h-4 flex-shrink-0" />{item.label}
              </Link>
            : <button key={item.label} onClick={() => item.nav && setActiveNav(item.nav)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:border-[hsl(var(--primary))]/40 hover:text-[hsl(var(--primary))] hover:shadow-sm transition-all">
                <item.icon className="w-4 h-4 flex-shrink-0" />{item.label}
              </button>
        ))}
      </div>

      {/* Recent products */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b">
          <h3 className="font-bold">Recent Products</h3>
          <Link href="/seller-dashboard/products" className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {products.length === 0 ? (
          <EmptyState icon={Package} title="No products yet" desc="Add your first product to get started"
            action={<Link href="/seller-dashboard/products/new"><Button size="sm" className="bg-[hsl(var(--primary))] text-white gap-2"><Plus className="w-3.5 h-3.5" /> Add Product</Button></Link>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border', STATUS_COLOR[product.status] ?? 'text-gray-600 bg-gray-50 border-gray-200')}>
                      {product.status.replace(/_/g, ' ')}
                    </span>
                    {product.rejection_reason && (
                      <span className="text-[10px] text-red-500 truncate max-w-[160px]">{product.rejection_reason}</span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-[hsl(var(--primary))] flex-shrink-0">${product.price.toFixed(2)}</span>
                <Link href={`/seller-dashboard/products/${product.id}/edit`}>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[hsl(var(--primary))] hover:bg-gray-100 transition-colors flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Boost CTA */}
      <div className="bg-gradient-to-r from-[hsl(142,72%,29%)] to-[hsl(142,65%,22%)] rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-5 h-5 text-emerald-200" />
              <span className="text-emerald-200 text-sm font-medium">Boost Your Sales</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-1">Advertise Your Products</h3>
            <p className="text-emerald-100 text-sm leading-relaxed max-w-sm">Get featured on the homepage, category pages, and sponsored search.</p>
          </div>
          <Link href="/seller-dashboard/ads/create" className="w-full sm:w-auto flex-shrink-0">
            <Button className="w-full sm:w-auto bg-white text-[hsl(var(--primary))] hover:bg-gray-100 font-semibold text-sm">
              Create Ad Campaign
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  const OrdersSection = () => {
    const [orderFilter, setOrderFilter] = useState<string>('all');
    const TERMINAL = ['delivered', 'failed_delivery', 'cancelled', 'refunded'];
    const filtered = orderFilter === 'all'       ? orders
      : orderFilter === 'active'    ? orders.filter(o => !TERMINAL.includes(o.status))
      : orderFilter === 'cancelled' ? orders.filter(o => ['cancelled', 'failed_delivery'].includes(o.status))
      : orders.filter(o => o.status === orderFilter);
    const activeCount  = orders.filter(o => !TERMINAL.includes(o.status)).length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const cancelledCount = orders.filter(o => ['cancelled', 'failed_delivery'].includes(o.status)).length;
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} total orders for your products</p>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {([
            { val: 'all',       label: `All (${orders.length})` },
            { val: 'active',    label: `Active (${activeCount})` },
            { val: 'delivered', label: `Delivered (${deliveredCount})` },
            { val: 'cancelled', label: `Cancelled (${cancelledCount})` },
          ] as { val: string; label: string }[]).map(f => (
            <button key={f.val} onClick={() => setOrderFilter(f.val)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all', orderFilter === f.val
                ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" desc="Orders for your products will appear here once customers start purchasing." />
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No {orderFilter} orders.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Order #', 'Customer', 'Amount', 'Status', 'Driver', 'Date'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(order => {
                    const sc = ORDER_STATUS_COLOR[order.status] ?? 'text-gray-600 bg-gray-50 border-gray-200';
                    const customer = order.customer_profiles;
                    const name = customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Customer';
                    return (
                      <>
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-gray-800 flex items-center gap-1">
                            <Hash className="w-3 h-3 text-gray-400" />{order.order_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{name}</td>
                        <td className="py-3 px-4 font-bold text-[hsl(var(--primary))]">${order.total_amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize', sc)}>{order.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="py-3 px-4">
                          {order.delivery_driver_accounts ? (
                            <div>
                              <p className="text-xs font-medium text-gray-800">
                                {order.delivery_driver_accounts.first_name} {order.delivery_driver_accounts.last_name}
                              </p>
                              {order.delivery_driver_accounts.phone && (
                                <a href={`tel:${order.delivery_driver_accounts.phone}`} className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5 mt-0.5">
                                  <Phone className="w-2.5 h-2.5" />{order.delivery_driver_accounts.phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </td>
                      </tr>
                      {order.status === 'failed_delivery' && order.delivery_failure_note && (
                        <tr key={`${order.id}-note`} className="bg-red-50">
                          <td colSpan={6} className="px-4 py-2.5">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="text-xs font-semibold text-red-700">Driver Note: </span>
                                <span className="text-xs text-red-600">{order.delivery_failure_note}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Ads &amp; Campaigns</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Promote your products to more customers</p>
        </div>
        <Link href="/seller-dashboard/ads/create">
          <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState icon={Megaphone} title="No campaigns yet"
            desc="Create your first ad campaign to start reaching more customers."
            action={
              <Link href="/seller-dashboard/ads/create">
                <Button size="sm" className="bg-[hsl(var(--primary))] text-white gap-2">
                  <Plus className="w-3.5 h-3.5" /> Create Campaign
                </Button>
              </Link>
            } />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Campaign', 'Placement', 'Dates', 'Budget', 'Performance', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map(c => {
                  const approvalColor = CAMPAIGN_STATUS_COLOR[c.admin_approval_status] ?? CAMPAIGN_STATUS_COLOR.draft;
                  const statusColor = CAMPAIGN_STATUS_COLOR[c.status] ?? CAMPAIGN_STATUS_COLOR.draft;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">{c.name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-600 capitalize">{c.placement.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(c.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} –{' '}
                        {new Date(c.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-gray-800">${c.total_budget.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">paid: ${c.amount_paid.toFixed(2)}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {c.impressions}</span>
                          <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {c.clicks}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border w-fit', statusColor)}>
                            {c.status}
                          </span>
                          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border w-fit', approvalColor)}>
                            {c.admin_approval_status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ad type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Megaphone, label: 'Homepage Banner', desc: 'Full-width hero banner on the homepage', badge: 'High Impact', placement: 'hero_banner' },
          { icon: TrendingUp, label: 'Sponsored Listing', desc: 'Appear at the top of search and category pages', badge: 'Popular', placement: 'search_results' },
          { icon: Star, label: 'Mid-Page Cards', desc: 'Card-style ad in the mid-page sponsored section', badge: 'Value', placement: 'mid_page' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{item.badge}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Link href="/seller-dashboard/ads/create" className="mt-auto">
              <Button size="sm" variant="outline" className="w-full text-xs border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]">
                Get Started <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );

  const SettlementsSection = () => {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total_amount, 0);
    const pendingOrders = orders.filter(o => !['delivered', 'failed_delivery', 'cancelled', 'refunded'].includes(o.status));
    const pendingRevenue = pendingOrders.reduce((s, o) => s + o.total_amount, 0);

    // Current settlement cycle: current calendar month
    const now = new Date();
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const cycleOrders = deliveredOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= cycleStart && d <= cycleEnd;
    });
    const cycleRevenue = cycleOrders.reduce((s, o) => s + o.total_amount, 0);

    return (
      <div className="space-y-4 sm:space-y-5">
        <div>
          <h2 className="text-xl font-bold">Settlements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Your earnings and payout history</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Earned (Delivered)', value: `$${totalRevenue.toFixed(2)}`, sub: `${deliveredOrders.length} orders delivered`, color: 'text-[hsl(var(--primary))]' },
            { label: 'Pending Revenue', value: `$${pendingRevenue.toFixed(2)}`, sub: `${pendingOrders.length} orders in progress`, color: 'text-amber-600' },
            { label: 'This Month', value: `$${cycleRevenue.toFixed(2)}`, sub: `${cycleStart.toLocaleString('en-AU', { month: 'long' })} ${cycleStart.getFullYear()} · ${cycleOrders.length} orders`, color: 'text-blue-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</p>
              <p className={cn('text-2xl font-bold mt-1', card.color)}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Current cycle orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Current Settlement Cycle</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cycleStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
                {cycleEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
              ${cycleRevenue.toFixed(2)}
            </span>
          </div>
          {cycleOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No delivered orders in this cycle yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Order #', 'Customer', 'Amount', 'Date'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cycleOrders.map(order => {
                    const customer = order.customer_profiles;
                    const name = customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Customer';
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-mono text-xs font-semibold text-gray-800">#{order.order_number}</td>
                        <td className="py-2.5 px-4 text-gray-700 text-xs">{name}</td>
                        <td className="py-2.5 px-4 font-bold text-[hsl(var(--primary))] text-xs">${order.total_amount.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Payouts are processed at the end of each calendar month. Contact the Baazar admin team for settlement disputes.</span>
        </div>
      </div>
    );
  };

  const AnalyticsSection = () => {
    const totalViews = products.reduce((s, p) => s + (p.view_count ?? 0), 0);
    const totalSold = products.reduce((s, p) => s + (p.purchase_count ?? 0), 0);

    const sorted = [...products].sort((a, b) => {
      if (analyticsSort === 'views') return (b.view_count ?? 0) - (a.view_count ?? 0);
      if (analyticsSort === 'sold') return (b.purchase_count ?? 0) - (a.purchase_count ?? 0);
      return (b.rating_average ?? 0) - (a.rating_average ?? 0);
    });

    const maxVal = sorted.length > 0
      ? Math.max(...sorted.map(p => analyticsSort === 'views' ? (p.view_count ?? 0) : analyticsSort === 'sold' ? (p.purchase_count ?? 0) : (p.rating_average ?? 0)), 1)
      : 1;

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your store performance</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Views', value: totalViews, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Sold', value: totalSold, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Products Listed', value: products.length, icon: Package, color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--secondary))]' },
            { label: 'Avg Rating', value: `${(seller.rating_average ?? 0).toFixed(1)} ★`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-semibold">Product Performance</h3>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([
                { val: 'views', label: 'Views' },
                { val: 'sold', label: 'Sold' },
                { val: 'rating', label: 'Rating' },
              ] as { val: typeof analyticsSort; label: string }[]).map(opt => (
                <button key={opt.val} onClick={() => setAnalyticsSort(opt.val)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                    analyticsSort === opt.val ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                  <ArrowUpDown className="w-2.5 h-2.5" />{opt.label}
                </button>
              ))}
            </div>
          </div>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No products to display</p>
          ) : (
            <div className="space-y-3">
              {sorted.slice(0, 8).map((p, i) => {
                const val = analyticsSort === 'views' ? (p.view_count ?? 0) : analyticsSort === 'sold' ? (p.purchase_count ?? 0) : (p.rating_average ?? 0);
                const pct = Math.round((val / maxVal) * 100);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {analyticsSort === 'rating' && p.rating_count > 0 && (
                            <span className="text-[10px] text-gray-400">({p.rating_count})</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {analyticsSort === 'views' && `${val} views`}
                            {analyticsSort === 'sold' && `${val} sold`}
                            {analyticsSort === 'rating' && `${val.toFixed ? Number(val).toFixed(1) : val} ★`}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {p.rating_average > 0 && analyticsSort !== 'rating' && (
                      <span className="text-[10px] text-amber-600 font-semibold flex-shrink-0 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{Number(p.rating_average).toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SettingsSection = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Store Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your store profile and preferences</p>
      </div>

      {/* Store profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[hsl(142,72%,29%)] to-[hsl(142,65%,22%)] p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {seller.display_name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">{seller.display_name}</p>
            <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1',
              seller.status === 'active' ? 'bg-white/20 text-white' : 'bg-red-500/30 text-red-100')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', seller.status === 'active' ? 'bg-green-300' : 'bg-red-300')} />
              {seller.status.charAt(0).toUpperCase() + seller.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          <div className="sm:pr-5 space-y-3 pb-4 sm:pb-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Store Metrics</p>
            {[
              { label: 'Total Products', value: products.length },
              { label: 'Published', value: publishedCount },
              { label: 'Total Sales', value: `$${(seller.total_sales ?? 0).toFixed(2)}` },
              { label: 'Average Rating', value: `${(seller.rating_average ?? 0).toFixed(1)} / 5.0` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="sm:pl-5 pt-4 sm:pt-0 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</p>
            {[
              { label: 'Account Status', value: seller.status },
              { label: 'Orders Received', value: orders.length },
              { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-gray-800 capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl">
          <p className="text-xs text-muted-foreground">
            To update your store name, logo, or contact details, please contact the Baazar admin team.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <h3 className="font-semibold text-gray-900">Products</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Add new products or manage your existing listings.</p>
          <div className="flex gap-2">
            <Link href="/seller-dashboard/products/new" className="flex-1">
              <Button size="sm" className="w-full bg-[hsl(var(--primary))] text-white text-xs gap-1">
                <Plus className="w-3 h-3" /> Add New
              </Button>
            </Link>
            <Link href="/seller-dashboard/products" className="flex-1">
              <Button size="sm" variant="outline" className="w-full text-xs">Manage All</Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center">
              <Truck className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <h3 className="font-semibold text-gray-900">Shipping &amp; Fulfilment</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Configure shipping zones, rates, and fulfilment preferences.</p>
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
            <Clock className="w-3.5 h-3.5" /> Coming soon
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
        <h3 className="font-semibold text-red-700 mb-1">Sign Out</h3>
        <p className="text-sm text-muted-foreground mb-4">Sign out of your seller account.</p>
        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
          onClick={async () => { await signOut(); window.location.replace('/seller-dashboard/login'); }}>
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </Button>
      </div>
    </div>
  );

  const ProductsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">My Products</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} total products</p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller-dashboard/products">
            <Button variant="outline" size="sm" className="text-xs hidden sm:flex">Full View</Button>
          </Link>
          <Link href="/seller-dashboard/products/new">
            <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
            </Button>
          </Link>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <EmptyState icon={Package} title="No products yet" desc="Add your first product to get started"
            action={<Link href="/seller-dashboard/products/new"><Button size="sm" className="bg-[hsl(var(--primary))] text-white gap-2"><Plus className="w-3.5 h-3.5" /> Add Product</Button></Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Product', 'Price', 'Stock', 'Status / Reason', 'Views / Sold', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 truncate max-w-[160px]">{product.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(product.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[hsl(var(--primary))] whitespace-nowrap">${product.price.toFixed(2)}</td>
                    <td className="py-3 px-4"><span className={cn('font-medium text-sm', product.stock_quantity <= 5 ? 'text-red-600' : 'text-gray-700')}>{product.stock_quantity}</span></td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border', STATUS_COLOR[product.status] ?? 'text-gray-600 bg-gray-50 border-gray-200')}>
                        {product.status.replace(/_/g, ' ')}
                      </span>
                      {product.rejection_reason && (
                        <p className="text-[10px] text-red-500 mt-1 truncate" title={product.rejection_reason}>{product.rejection_reason}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{product.view_count}</span>
                        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{product.purchase_count}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/seller-dashboard/products/${product.id}/edit`}>
                          <button className="text-xs text-[hsl(var(--primary))] hover:underline font-medium flex items-center gap-1">
                            <Pencil className="w-3 h-3" />Edit
                          </button>
                        </Link>
                        {['draft', 'rejected'].includes(product.status) && (
                          <button
                            onClick={() => submitForApproval(product.id)}
                            disabled={submitting === product.id}
                            className="text-xs text-amber-600 hover:underline font-medium flex items-center gap-1 disabled:opacity-50">
                            <Send className="w-3 h-3" />
                            {submitting === product.id ? '...' : 'Submit'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: activeOrders },
    { id: 'ads', label: 'Ads & Campaigns', icon: Megaphone, count: campaigns.length },
    { id: 'settlements', label: 'Settlements', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const SECTIONS: Record<string, React.ReactNode> = {
    overview: <OverviewSection />,
    products: <ProductsSection />,
    orders: <OrdersSection />,
    ads: <AdsSection />,
    settlements: <SettlementsSection />,
    analytics: <AnalyticsSection />,
    settings: <SettingsSection />,
  };

  const SidebarInner = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="p-4 bg-[hsl(var(--primary))]">
        <div className="flex items-center justify-between">
          <div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <span className="text-white font-bold text-lg">{seller.display_name[0]}</span>
            </div>
            <p className="text-white font-bold text-sm truncate max-w-[140px]">{seller.display_name}</p>
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 inline-block',
              seller.status === 'active' ? 'bg-white/20 text-white' : 'bg-red-500/30 text-red-100')}>
              {seller.status.toUpperCase()}
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 self-start">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <nav className="p-2 flex-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => { setActiveNav(item.id); onClose?.(); }}
            className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5',
              activeNav === item.id
                ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="text-[10px] font-bold bg-[hsl(var(--primary))] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t space-y-0.5">
        <Link href="/seller-dashboard/products"
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl text-xs transition-colors">
          <Package className="w-3.5 h-3.5" /> Manage Products
        </Link>
        <Link href="/seller-dashboard/products/new"
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl text-xs transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add New Product
        </Link>
        <button onClick={async () => { await signOut(); window.location.replace('/seller-dashboard/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
        <a href="/" className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-xl text-xs transition-colors">
          ← Back to Store
        </a>
      </div>
    </>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl overflow-hidden">
            <SidebarInner onClose={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNavOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-bold text-gray-900 text-sm truncate max-w-[140px]">{seller.display_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/seller-dashboard/products">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 hidden sm:flex">
              <Package className="w-3 h-3" /> Products
            </Button>
          </Link>
          <Link href="/seller-dashboard/products/new">
            <Button size="sm" className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </Link>
        </div>
      </div>

      <div className="container-page py-4 sm:py-6">
        <div className="flex gap-5 lg:gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
              <SidebarInner />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {SECTIONS[activeNav]}
          </div>
        </div>
      </div>
    </div>
  );
}
