'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Eye, Pencil, Send, ChevronLeft, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  stock_quantity: number;
  view_count: number;
  purchase_count: number;
  created_at: string;
  pending_edit: Record<string, unknown> | null;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-600 bg-gray-50 border-gray-200',
  submitted: 'text-blue-600 bg-blue-50 border-blue-200',
  pending_admin_approval: 'text-amber-600 bg-amber-50 border-amber-200',
  approved: 'text-teal-600 bg-teal-50 border-teal-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
  published: 'text-green-600 bg-green-50 border-green-200',
  hidden: 'text-gray-500 bg-gray-50 border-gray-200',
  suspended: 'text-red-700 bg-red-50 border-red-200',
};

const FILTERS = ['all', 'published', 'pending_admin_approval', 'draft', 'rejected'];

export default function SellerProductsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: su } = await supabase.from('seller_users').select('seller_id').eq('user_id', user.id).maybeSingle();
      if (!su) return;
      setSellerId(su.seller_id);
      setFetching(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, price, status, stock_quantity, view_count, purchase_count, created_at, pending_edit')
        .eq('seller_id', su.seller_id)
        .order('created_at', { ascending: false });
      setProducts(data ?? []);
      setFetching(false);
    };
    load();
  }, [user, supabase]);

  const submitForApproval = async (productId: string) => {
    setSubmitting(productId);
    const { error } = await supabase.from('products')
      .update({ status: 'pending_admin_approval', rejection_reason: null })
      .eq('id', productId);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'pending_admin_approval' } : p));
    }
    setSubmitting(null);
  };

  if (loading || !user) return null;

  const filtered = products
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-page py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/seller-dashboard" className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium">My Products</span>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Products</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{products.length} products total</p>
          </div>
          <Link href="/seller-dashboard/products/new">
            <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Published', count: products.filter(p => p.status === 'published').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
            { label: 'Pending Approval', count: products.filter(p => p.status === 'pending_admin_approval').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
            { label: 'Drafts', count: products.filter(p => p.status === 'draft').length, color: 'text-gray-600', bg: 'bg-gray-50', icon: Package },
            { label: 'Rejected', count: products.filter(p => p.status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <div>
                <div className={cn('text-xl font-bold leading-none', stat.color)}>{stat.count}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all whitespace-nowrap',
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {f === 'all' ? 'All' : f === 'pending_admin_approval' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {fetching ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading products...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-medium text-gray-700">No products found</p>
              <p className="text-sm text-muted-foreground mb-5 mt-1">
                {search ? 'Try a different search term' : 'Add your first product to get started'}
              </p>
              <Link href="/seller-dashboard/products/new">
                <Button size="sm" className="bg-[hsl(var(--primary))] text-white gap-2">
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Product</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Price</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Stock</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Views</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 max-w-[220px] truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[hsl(var(--primary))]">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-medium', p.stock_quantity <= 5 ? 'text-red-600' : 'text-gray-700')}>{p.stock_quantity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize w-fit', STATUS_COLOR[p.status] ?? 'text-gray-600 bg-gray-50')}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                          {p.pending_edit && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border text-amber-700 bg-amber-50 border-amber-200 w-fit flex items-center gap-1">
                              <Pencil className="w-2.5 h-2.5" /> Edit pending review
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {p.view_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/seller-dashboard/products/${p.id}/edit`}>
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          {['draft', 'rejected'].includes(p.status) && (
                            <button
                              onClick={() => submitForApproval(p.id)}
                              disabled={submitting === p.id}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors font-medium"
                            >
                              <Send className="w-3 h-3" />
                              {submitting === p.id ? 'Submitting...' : 'Submit'}
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
    </div>
  );
}
