'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Search, Star, Package, Plus, X, CircleCheck as CheckCircle2, Store, Mail, UserPlus, MessageSquare, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Seller {
  id: string; business_name: string; display_name: string; contact_email: string; contact_phone: string;
  suburb: string; state: string; business_type: string; status: string; rating_average: number;
  rating_count: number; total_products: number; total_sales: number; created_at: string;
}

interface SellerRating {
  id: string; rating: number; comment: string | null; created_at: string;
  customer_first_name: string; customer_last_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-green-700 bg-green-50 border-green-200' },
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  suspended: { label: 'Suspended', color: 'text-red-700 bg-red-50 border-red-200' },
  closed: { label: 'Closed', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const BLANK_FORM = {
  business_name: '', display_name: '', contact_email: '', contact_phone: '',
  business_abn: '', business_type: 'retailer', business_address: '',
  suburb: '', state: '', postcode: '', country: 'Australia',
  commission_rate: '10', description: '',
  seller_first_name: '',
  create_account: true,
};

export default function AdminBaazarSellersPage() {
  const { checking } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [ratingsSeller, setRatingsSeller] = useState<Seller | null>(null);
  const [ratingsData, setRatingsData] = useState<SellerRating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const openRatings = async (seller: Seller) => {
    setRatingsSeller(seller);
    setRatingsLoading(true);
    const { data } = await supabase
      .from('seller_ratings')
      .select('id, rating, comment, created_at, user_id')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });
    if (data) {
      const enriched = await Promise.all(data.map(async (r) => {
        const { data: cp } = await supabase.from('customer_profiles').select('first_name, last_name').eq('user_id', r.user_id).maybeSingle();
        return { id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at, customer_first_name: cp?.first_name ?? 'Unknown', customer_last_name: cp?.last_name ?? '' };
      }));
      setRatingsData(enriched);
    }
    setRatingsLoading(false);
  };

  const load = async () => {
    setLoading(true);
    let q = supabase.from('seller_profiles').select('id, business_name, display_name, contact_email, contact_phone, suburb, state, business_type, status, rating_average, rating_count, total_products, total_sales, created_at').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setSellers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (!checking) load(); }, [checking, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('seller_profiles').update({ status }).eq('id', id);
    load();
  };

  const sendInvite = async (seller: Seller) => {
    setSendingInvite(seller.id);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/create-seller-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        seller_id: seller.id,
        email: seller.contact_email,
        business_name: seller.business_name,
      }),
    });

    const result = await res.json();
    setSendingInvite(null);
    if (!res.ok || result.error) {
      toast({ title: 'Invite failed', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Invite sent!', description: `Approval email sent to ${seller.contact_email}.` });
    }
  };

  const createSellerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const slug = form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const { data: profile, error: profileError } = await supabase.from('seller_profiles').insert({
      business_name: form.business_name,
      display_name: form.display_name || form.business_name,
      slug,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || null,
      business_abn: form.business_abn || null,
      business_type: form.business_type,
      business_address: form.business_address || null,
      suburb: form.suburb || null,
      state: form.state || null,
      postcode: form.postcode || null,
      country: form.country,
      commission_rate: parseFloat(form.commission_rate) || 10,
      description: form.description || null,
      status: 'active',
      rating_average: 0,
      rating_count: 0,
      total_products: 0,
      total_sales: 0,
    }).select('id').single();

    if (profileError || !profile) {
      toast({ title: 'Error creating seller profile', description: profileError?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (form.create_account && form.contact_email.trim()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? anonKey;

      const res = await fetch(`${supabaseUrl}/functions/v1/create-seller-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          seller_id: profile.id,
          email: form.contact_email.trim(),
          first_name: form.seller_first_name.trim() || undefined,
          business_name: form.business_name,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        toast({
          title: 'Profile created, but account setup had an issue',
          description: result.error ?? 'The seller profile was created. You can retry the account invite later.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Seller account created & invite sent!', description: `An approval email with a password setup link was sent to ${form.contact_email}.` });
      }
    } else {
      toast({ title: 'Seller profile created', description: 'No account was created. You can add one later from the seller list.' });
    }

    setForm({ ...BLANK_FORM });
    setShowCreate(false);
    setSaving(false);
    load();
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = sellers.filter(s => !search || s.business_name.toLowerCase().includes(search.toLowerCase()) || s.contact_email.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminBaazarShell title="Sellers / B2B" subtitle={`${sellers.length} registered sellers`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sellers..." className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'active', 'pending', 'suspended', 'closed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all',
                  statusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setShowCreate(v => !v)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-shrink-0">
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'Create Seller Profile'}
        </Button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h2 className="font-bold mb-5 flex items-center gap-2 text-gray-900">
            <Store className="w-4 h-4 text-emerald-600" /> Create Seller Profile
          </h2>
          <form onSubmit={createSellerProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Name <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-9 text-sm" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} required />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input className="mt-1.5 h-9 text-sm" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Same as business name if blank" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Email <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-9 text-sm" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} required />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input className="mt-1.5 h-9 text-sm" type="tel" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ABN</Label>
                <Input className="mt-1.5 h-9 text-sm" value={form.business_abn} onChange={e => setForm(f => ({ ...f, business_abn: e.target.value }))} placeholder="xx xxx xxx xxx" />
              </div>
              <div>
                <Label>Business Type</Label>
                <select value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                  className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option value="retailer">Retailer</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="manufacturer">Manufacturer</option>
                  <option value="importer">Importer</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Business Address</Label>
              <Input className="mt-1.5 h-9 text-sm" value={form.business_address} onChange={e => setForm(f => ({ ...f, business_address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Suburb</Label>
                <Input className="mt-1.5 h-9 text-sm" value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} />
              </div>
              <div>
                <Label>State</Label>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option value="">Select</option>
                  {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Commission %</Label>
                <Input className="mt-1.5 h-9 text-sm" type="number" min="0" max="50" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setForm(f => ({ ...f, create_account: !f.create_account }))}
                  className={`w-10 h-5 rounded-full transition-all relative cursor-pointer flex-shrink-0 ${form.create_account ? 'bg-emerald-500' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.create_account ? 'left-5' : 'left-0.5'}`} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-800 cursor-pointer flex items-center gap-2" onClick={() => setForm(f => ({ ...f, create_account: !f.create_account }))}>
                    <UserPlus className="w-4 h-4 text-emerald-600" /> Create Seller Account & Send Invite Email
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">Creates a login account for the seller and emails them a password setup link.</p>
                </div>
              </div>

              {form.create_account && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-emerald-700">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>A congratulations email will be sent to <strong>{form.contact_email || 'the contact email above'}</strong> with a link to set their password and access the seller dashboard.</span>
                  </div>
                  <div>
                    <Label className="text-xs">Seller&apos;s First Name <span className="text-gray-400 font-normal">(for personalised email)</span></Label>
                    <Input
                      className="mt-1.5 h-9 text-sm"
                      value={form.seller_first_name}
                      onChange={e => setForm(f => ({ ...f, seller_first_name: e.target.value }))}
                      placeholder="e.g. Ahmed"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Seller Profile'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Business</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Products</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Rating</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Sales</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">Loading sellers...</td></tr>
                : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12">
                    <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No sellers found</p>
                    <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-emerald-600 hover:underline font-medium">Create the first seller profile</button>
                  </td></tr>
                ) : filtered.map(seller => {
                  const sc = STATUS_CONFIG[seller.status] ?? { label: seller.status, color: 'text-gray-600 bg-gray-50 border-gray-200' };
                  return (
                    <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0">{seller.business_name[0]}</div>
                          <div>
                            <p className="font-semibold text-xs">{seller.business_name}</p>
                            <p className="text-[10px] text-gray-400">{seller.display_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-xs">{seller.contact_email}</p><p className="text-[10px] text-gray-400">{seller.contact_phone}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{[seller.suburb, seller.state].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600"><span className="flex items-center gap-1"><Package className="w-3 h-3" /> {seller.total_products}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => openRatings(seller)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:underline group">
                          <Star className="w-3 h-3 fill-current" />
                          {seller.rating_average?.toFixed(1) ?? '0.0'}
                          {(seller.rating_count ?? 0) > 0 && <span className="text-gray-400 text-[10px]">({seller.rating_count})</span>}
                          <MessageSquare className="w-3 h-3 text-gray-300 group-hover:text-amber-500 ml-0.5" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-600">${(seller.total_sales ?? 0).toFixed(0)}</td>
                      <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', sc.color)}>{sc.label}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => sendInvite(seller)}
                            disabled={sendingInvite === seller.id}
                            title="Send / resend approval invite email"
                            className="flex items-center gap-1 text-xs px-2 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <Mail className="w-3 h-3" />
                            {sendingInvite === seller.id ? 'Sending...' : 'Invite'}
                          </button>
                          <select value={seller.status} onChange={e => updateStatus(seller.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 cursor-pointer hover:border-gray-300">
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Ratings slide-over */}
      {ratingsSeller && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setRatingsSeller(null)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Seller Ratings</h3>
                <p className="text-xs text-gray-500 mt-0.5">{ratingsSeller.display_name} · {ratingsSeller.rating_count ?? 0} review{ratingsSeller.rating_count !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={cn('w-4 h-4', s <= Math.round(ratingsSeller.rating_average ?? 0) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
                  ))}
                  <span className="text-sm font-bold text-gray-900 ml-1">{(ratingsSeller.rating_average ?? 0).toFixed(1)}</span>
                </div>
                <button onClick={() => setRatingsSeller(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Rating breakdown */}
            {ratingsData.length > 0 && (
              <div className="px-5 py-3 border-b bg-gray-50">
                <div className="space-y-1">
                  {[5,4,3,2,1].map(star => {
                    const count = ratingsData.filter(r => r.rating === star).length;
                    const pct = ratingsData.length > 0 ? (count / ratingsData.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right text-gray-500">{star}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-gray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {ratingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : ratingsData.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No ratings yet for this seller</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ratingsData.map(r => (
                    <div key={r.id} className="pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-xs font-bold text-emerald-600 flex-shrink-0">
                          {r.customer_first_name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-800">{r.customer_first_name} {r.customer_last_name}</span>
                            <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="flex mt-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={cn('w-3.5 h-3.5', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
                            ))}
                          </div>
                          {r.comment && (
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{r.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminBaazarShell>
  );
}
