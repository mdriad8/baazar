'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Search, CircleCheck as CheckCircle2, Circle as XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Application {
  id: string; business_name: string; contact_name: string; contact_email: string;
  contact_phone: string; business_abn: string; business_type: string; suburb: string; state: string;
  status: string; message: string; has_halal_cert: boolean; has_food_handling_cert: boolean;
  estimated_monthly_revenue: number; reviewed_at: string | null; review_note: string; created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  under_review: { label: 'Under Review', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  approved: { label: 'Approved', color: 'text-green-700 bg-green-50 border-green-200' },
  rejected: { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' },
  on_hold: { label: 'On Hold', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

export default function AdminBaazarSellerApplicationsPage() {
  const { checking } = useAdmin();
  const supabase = createClient();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('seller_applications').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setApps(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (!checking) load(); }, [checking, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    await supabase.from('seller_applications').update({ status, review_note: reviewNote, reviewed_at: new Date().toISOString() }).eq('id', id);
    setSaving(false); setExpanded(null); setReviewNote(''); load();
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = apps.filter(a => !search || a.business_name.toLowerCase().includes(search.toLowerCase()) || a.contact_email.toLowerCase().includes(search.toLowerCase()));
  const pending = apps.filter(a => a.status === 'pending' || a.status === 'under_review').length;

  return (
    <AdminBaazarShell title="Seller Applications" subtitle={`${apps.length} total · ${pending} pending review`}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
          <button key={key} onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}
            className={cn('bg-white rounded-xl border p-3 text-left transition-all hover:shadow-sm', statusFilter === key ? 'border-emerald-500 shadow-sm' : 'border-gray-100')}>
            <div className={cn('text-xl font-bold', conf.color.split(' ')[0])}>{apps.filter(a => a.status === key).length}</div>
            <div className="text-xs text-gray-500 mt-0.5">{conf.label}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all',
                statusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              {s === 'under_review' ? 'Under Review' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-muted-foreground">Loading applications...</div>
          : filtered.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-muted-foreground">No applications found</div>
          : filtered.map(app => {
            const sc = STATUS_CONFIG[app.status] ?? { label: app.status, color: 'text-gray-600 bg-gray-50 border-gray-200' };
            const isExpanded = expanded === app.id;
            return (
              <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">{app.business_name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{app.business_name}</p>
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', sc.color)}>{sc.label}</span>
                      {app.has_halal_cert && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border text-green-700 bg-green-50 border-green-200">Halal Cert</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{app.contact_name} · {app.contact_email} · {app.contact_phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-gray-500">{[app.suburb, app.state].filter(Boolean).join(', ')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(app.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <button onClick={() => setExpanded(isExpanded ? null : app.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
                      <div><p className="text-xs text-gray-500 mb-0.5">ABN</p><p className="font-medium text-xs">{app.business_abn || '—'}</p></div>
                      <div><p className="text-xs text-gray-500 mb-0.5">Business Type</p><p className="font-medium text-xs capitalize">{app.business_type || '—'}</p></div>
                      <div><p className="text-xs text-gray-500 mb-0.5">Est. Monthly Revenue</p><p className="font-medium text-xs">${(app.estimated_monthly_revenue ?? 0).toLocaleString()}</p></div>
                      <div><p className="text-xs text-gray-500 mb-0.5">Food Handling Cert</p><p className="font-medium text-xs">{app.has_food_handling_cert ? 'Yes' : 'No'}</p></div>
                      {app.message && <div className="sm:col-span-2"><p className="text-xs text-gray-500 mb-0.5">Message</p><p className="text-xs text-gray-700">{app.message}</p></div>}
                    </div>
                    {(app.status === 'pending' || app.status === 'under_review') && (
                      <div className="border-t border-gray-100 pt-4">
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Review Note (optional)</label>
                        <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          placeholder="Add a note to the applicant..." />
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => updateStatus(app.id, 'under_review')} disabled={saving}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Under Review
                          </button>
                          <button onClick={() => updateStatus(app.id, 'rejected')} disabled={saving}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                          <button onClick={() => updateStatus(app.id, 'approved')} disabled={saving}
                            className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                        </div>
                      </div>
                    )}
                    {app.reviewed_at && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <p className="text-[11px] text-gray-400">Reviewed on {new Date(app.reviewed_at).toLocaleDateString('en-AU')}</p>
                        {app.review_note && <p className="text-xs text-gray-600 mt-1">{app.review_note}</p>}
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
