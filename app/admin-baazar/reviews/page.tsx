'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { Star, Trash2, Eye, Search, CircleCheck as CheckCircle2, Circle as XCircle, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  products?: { name: string; slug: string } | null;
  customer_profiles?: { first_name: string; last_name: string; avatar_url: string | null } | null;
}

export default function ReviewsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Review | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select('*, products(name, slug), customer_profiles(first_name, last_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(300);
    setReviews((data ?? []).map((r: Record<string, unknown>) => ({ ...r, images: (r.images as string[]) ?? [] })) as Review[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  const approve = async (id: string) => {
    setProcessing(id);
    await supabase.from('product_reviews').update({ is_approved: true }).eq('id', id);
    toast({ title: 'Review approved' });
    setSelected(prev => prev?.id === id ? { ...prev, is_approved: true } : prev);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
    setProcessing(null);
  };

  const unapprove = async (id: string) => {
    setProcessing(id);
    await supabase.from('product_reviews').update({ is_approved: false }).eq('id', id);
    toast({ title: 'Review unpublished' });
    setSelected(prev => prev?.id === id ? { ...prev, is_approved: false } : prev);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: false } : r));
    setProcessing(null);
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return;
    await supabase.from('product_reviews').delete().eq('id', id);
    toast({ title: 'Review deleted' });
    if (selected?.id === id) setSelected(null);
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const filtered = reviews.filter(r => {
    const name = `${r.customer_profiles?.first_name ?? ''} ${r.customer_profiles?.last_name ?? ''}`.toLowerCase();
    const matchSearch = !search ||
      r.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.body?.toLowerCase().includes(search.toLowerCase()) ||
      name.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'approved' ? r.is_approved : !r.is_approved);
    return matchSearch && matchFilter;
  });

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => !r.is_approved).length,
    approved: reviews.filter(r => r.is_approved).length,
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Customer Reviews" subtitle="Moderate and manage product reviews">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Reviews', value: counts.all, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pending Review', value: counts.pending, icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved', value: counts.approved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Avg Rating', value: avgRating.toFixed(1), icon: Star, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* List panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input className="pl-9 h-9" placeholder="Search product, reviewer, content..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1">
                {(['all', 'pending', 'approved'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize',
                      filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>
                    {f}{f !== 'all' && ` (${counts[f]})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse"><div className="h-16 bg-gray-100 rounded" /></div>
                ))
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No reviews found</div>
              ) : filtered.map(r => {
                const name = r.customer_profiles
                  ? `${r.customer_profiles.first_name} ${r.customer_profiles.last_name}`
                  : 'Anonymous';
                return (
                  <button key={r.id} onClick={() => setSelected(r)}
                    className={cn('w-full text-left p-4 hover:bg-gray-50 transition-colors',
                      selected?.id === r.id && 'bg-emerald-50/60 border-l-2 border-emerald-500'
                    )}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {name[0]?.toUpperCase() ?? 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn('w-3 h-3', i < r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
                            ))}
                          </div>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium border',
                            r.is_approved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}>
                            {r.is_approved ? 'Approved' : 'Pending'}
                          </span>
                          {r.images?.length > 0 && (
                            <span className="text-[10px] text-gray-400">{r.images.length} photo{r.images.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-800 truncate">{name} — <span className="text-gray-400 font-normal">{r.products?.name ?? 'Unknown product'}</span></p>
                        {r.title && <p className="text-xs font-semibold text-gray-700 truncate mt-0.5">{r.title}</p>}
                        {r.body && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{r.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 h-fit lg:sticky lg:top-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={cn('w-4 h-4', s <= selected.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{new Date(selected.created_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-lg font-semibold border',
                  selected.is_approved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                )}>
                  {selected.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>

              {/* Reviewer */}
              <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {selected.customer_profiles ? selected.customer_profiles.first_name[0]?.toUpperCase() : 'A'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {selected.customer_profiles ? `${selected.customer_profiles.first_name} ${selected.customer_profiles.last_name}` : 'Anonymous'}
                  </p>
                  {selected.is_verified_purchase && (
                    <p className="text-[10px] text-blue-600 font-medium">Verified Purchase</p>
                  )}
                </div>
              </div>

              {/* Product */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-700">Product: </span>
                {selected.products?.name ?? 'Unknown'}
              </div>

              {/* Review content */}
              <div className="space-y-2">
                {selected.title && <p className="font-semibold text-sm text-gray-900">{selected.title}</p>}
                <p className="text-sm text-gray-600 leading-relaxed">{selected.body}</p>
              </div>

              {/* Images */}
              {selected.images?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Review Photos ({selected.images.length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.images.map((url, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                        <Image src={url} alt="" width={64} height={64} className="object-cover w-full h-full" unoptimized />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                {!selected.is_approved ? (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 w-full justify-center"
                    disabled={processing === selected.id} onClick={() => approve(selected.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Publish
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1.5 w-full justify-center"
                    disabled={processing === selected.id} onClick={() => unapprove(selected.id)}>
                    <XCircle className="w-3.5 h-3.5" /> Unpublish
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5 w-full justify-center"
                  onClick={() => deleteReview(selected.id)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Review
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 flex items-center justify-center p-10 text-center h-fit">
              <div>
                <Eye className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">Select a review</p>
                <p className="text-xs text-gray-400 mt-1">Click any review to inspect and moderate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminBaazarShell>
  );
}
