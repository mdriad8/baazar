'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/lib/auth/context';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Search, CircleCheck as CheckCircle2, Circle as XCircle, ChevronDown, ChevronUp, Megaphone, Image as ImageIcon, ExternalLink, ChartBar as BarChart2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string; name: string; ad_type: string; placement: string; start_date: string; end_date: string;
  total_budget: number; amount_paid: number; payment_status: string; status: string;
  admin_approval_status: string; admin_note: string; impressions: number; clicks: number;
  headline: string | null; tagline: string | null; cta_text: string | null; cta_url: string | null;
  banner_image_url: string | null; created_at: string;
  seller_profiles: { business_name: string } | null;
  products: { name: string; slug: string } | null;
}

const APPROVAL_COLORS: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  approved: 'text-green-700 bg-green-50 border-green-200',
  rejected: 'text-red-700 bg-red-50 border-red-200',
};

const PLACEMENT_INFO: Record<string, { label: string; desc: string; color: string }> = {
  hero_banner: { label: 'Hero Banner', desc: 'Full-width banner below featured products on home page', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  mid_page: { label: 'Mid-Page Cards', desc: 'Up to 3 card ads between trending & halal sections', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  search_results: { label: 'Search Results', desc: 'Promoted listing shown in product search results', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  category_page: { label: 'Category Page', desc: 'Sponsored banner shown on category listing pages', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  sidebar: { label: 'Sidebar', desc: 'Side column ad placement (desktop only)', color: 'text-gray-700 bg-gray-50 border-gray-200' },
};

export default function AdminBaazarAdsPage() {
  const { checking } = useAdmin();
  const { user } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [creativeEdits, setCreativeEdits] = useState<Record<string, Partial<Campaign>>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('campaigns')
      .select('id, name, ad_type, placement, start_date, end_date, total_budget, amount_paid, payment_status, status, admin_approval_status, admin_note, impressions, clicks, headline, tagline, cta_text, cta_url, banner_image_url, created_at, seller_profiles(business_name), products(name, slug)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('admin_approval_status', filter);
    const { data } = await q;
    setCampaigns((data as unknown as Campaign[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (!checking) load(); }, [checking, filter]);

  const updateApproval = async (id: string, status: string) => {
    setSaving(true);
    const creative = creativeEdits[id] ?? {};
    const { error } = await supabase.from('campaigns').update({
      admin_approval_status: status,
      admin_note: noteMap[id] ?? '',
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      status: status === 'approved' ? 'active' : 'rejected',
      ...creative,
    }).eq('id', id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); }
    else { toast({ title: status === 'approved' ? 'Ad approved and activated' : 'Ad rejected' }); }
    setSaving(false); setExpanded(null); setNoteMap(prev => ({ ...prev, [id]: '' })); load();
  };

  const saveCreative = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from('campaigns').update(creativeEdits[id] ?? {}).eq('id', id);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Creative details saved' }); }
    setSaving(false); load();
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = campaigns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.seller_profiles?.business_name ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const pending = campaigns.filter(c => c.admin_approval_status === 'pending').length;

  return (
    <AdminBaazarShell title="Ads & Campaigns" subtitle={`${campaigns.length} total · ${pending} pending approval`}>
      {/* Placement legend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Ad Placements on Storefront</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(PLACEMENT_INFO).map(([key, info]) => (
            <div key={key} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50/60">
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0', info.color)}>{info.label}</span>
              <p className="text-[11px] text-gray-500 leading-snug">{info.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {['pending', 'approved', 'rejected'].map(key => (
          <button key={key} onClick={() => setFilter(key === filter ? 'all' : key)}
            className={cn('bg-white rounded-xl border p-3 text-left transition-all hover:shadow-sm', filter === key ? 'border-emerald-500 shadow-sm' : 'border-gray-100')}>
            <div className={cn('text-xl font-bold', APPROVAL_COLORS[key]?.split(' ')[0])}>{campaigns.filter(c => c.admin_approval_status === key).length}</div>
            <div className="text-xs text-gray-500 mt-0.5 capitalize">{key}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or seller..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all',
                filter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-16" />)
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-muted-foreground">No campaigns found</div>
        ) : filtered.map(campaign => {
          const ac = APPROVAL_COLORS[campaign.admin_approval_status] ?? 'text-gray-600 bg-gray-50 border-gray-200';
          const placementInfo = PLACEMENT_INFO[campaign.placement];
          const isExpanded = expanded === campaign.id;
          const edit = creativeEdits[campaign.id] ?? {};
          const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : '0.0';

          return (
            <div key={campaign.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(isExpanded ? null : campaign.id)}>
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{campaign.name}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize', ac)}>{campaign.admin_approval_status}</span>
                    {placementInfo && (
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', placementInfo.color)}>{placementInfo.label}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {campaign.seller_profiles?.business_name ?? '—'} · {campaign.products?.name ?? '—'} · {campaign.start_date} → {campaign.end_date}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block mr-2">
                  <p className="text-sm font-bold text-emerald-600">${(campaign.total_budget ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{campaign.impressions} impr · {campaign.clicks} clicks</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/30 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Ad Type', value: campaign.ad_type?.replace(/_/g, ' ') },
                      { label: 'Budget', value: `$${(campaign.total_budget ?? 0).toFixed(2)}` },
                      { label: 'Payment', value: campaign.payment_status, colored: true },
                      { label: 'Impressions', value: campaign.impressions ?? 0, icon: BarChart2 },
                      { label: 'Clicks', value: campaign.clicks ?? 0 },
                      { label: 'CTR', value: `${ctr}%` },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white rounded-lg border border-gray-100 p-3">
                        <p className="text-[11px] text-gray-500 mb-0.5">{stat.label}</p>
                        <p className={cn('text-sm font-bold capitalize', stat.colored && (campaign.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'))}>{String(stat.value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Creative details editor */}
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Ad Creative Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Headline</Label>
                        <Input className="mt-1 h-8 text-xs" placeholder="e.g. Fresh Halal Deals This Week"
                          value={edit.headline ?? campaign.headline ?? ''}
                          onChange={e => setCreativeEdits(prev => ({ ...prev, [campaign.id]: { ...prev[campaign.id], headline: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Tagline</Label>
                        <Input className="mt-1 h-8 text-xs" placeholder="e.g. Up to 30% off selected items"
                          value={edit.tagline ?? campaign.tagline ?? ''}
                          onChange={e => setCreativeEdits(prev => ({ ...prev, [campaign.id]: { ...prev[campaign.id], tagline: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">CTA Button Text</Label>
                        <Input className="mt-1 h-8 text-xs" placeholder="e.g. Shop Now"
                          value={edit.cta_text ?? campaign.cta_text ?? ''}
                          onChange={e => setCreativeEdits(prev => ({ ...prev, [campaign.id]: { ...prev[campaign.id], cta_text: e.target.value } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">CTA URL (optional, defaults to product page)</Label>
                        <Input className="mt-1 h-8 text-xs" placeholder="/category/halal-meat"
                          value={edit.cta_url ?? campaign.cta_url ?? ''}
                          onChange={e => setCreativeEdits(prev => ({ ...prev, [campaign.id]: { ...prev[campaign.id], cta_url: e.target.value } }))} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Banner Image URL</Label>
                        <Input className="mt-1 h-8 text-xs" placeholder="https://images.pexels.com/..."
                          value={edit.banner_image_url ?? campaign.banner_image_url ?? ''}
                          onChange={e => setCreativeEdits(prev => ({ ...prev, [campaign.id]: { ...prev[campaign.id], banner_image_url: e.target.value } }))} />
                        <p className="text-[11px] text-gray-400 mt-1">Leave blank to use the product&apos;s image. Recommended: 1200×400px landscape image.</p>
                      </div>
                    </div>
                    {creativeEdits[campaign.id] && Object.keys(creativeEdits[campaign.id]).length > 0 && (
                      <button onClick={() => saveCreative(campaign.id)} disabled={saving}
                        className="mt-3 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        {saving ? 'Saving...' : 'Save Creative Changes'}
                      </button>
                    )}
                  </div>

                  {/* Approve / Reject */}
                  {campaign.admin_approval_status === 'pending' && (
                    <div className="bg-white rounded-xl border border-amber-100 p-4">
                      <h3 className="text-xs font-semibold text-gray-700 mb-2">Review Decision</h3>
                      <textarea
                        value={noteMap[campaign.id] ?? ''}
                        onChange={e => setNoteMap(prev => ({ ...prev, [campaign.id]: e.target.value }))}
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-3"
                        placeholder="Optional note to the seller..."
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => updateApproval(campaign.id, 'rejected')} disabled={saving}
                          className="text-xs px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                        <button onClick={() => updateApproval(campaign.id, 'approved')} disabled={saving}
                          className="text-xs px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approve & Activate
                        </button>
                      </div>
                    </div>
                  )}

                  {campaign.admin_approval_status === 'approved' && (
                    <div className="flex justify-end">
                      <button onClick={() => updateApproval(campaign.id, 'rejected')} disabled={saving}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Revoke Approval
                      </button>
                    </div>
                  )}

                  {campaign.admin_note && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">Note: {campaign.admin_note}</p>
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
