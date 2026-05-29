'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { RefreshCcw, Clock, CircleCheck as CheckCircle2, Circle as XCircle, Search, CircleAlert as AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Refund {
  id: string;
  order_id: string;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  processed: 'bg-blue-100 text-blue-700',
};

export default function RefundsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('refunds')
      .select('id, order_id, amount, reason, status, created_at, approved_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setRefunds(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, supabase]);

  const updateStatus = async (id: string, status: string) => {
    setProcessing(id);
    const update: Record<string, unknown> = { status };
    if (status === 'approved') update.approved_at = new Date().toISOString();
    const { error } = await supabase.from('refunds').update(update).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Refund ${status}` });
      await load();
    }
    setProcessing(null);
  };

  const filtered = refunds.filter(r => !search || r.id.includes(search) || r.order_id?.includes(search));

  const counts = {
    pending: refunds.filter(r => r.status === 'pending').length,
    approved: refunds.filter(r => r.status === 'approved').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    total: refunds.reduce((s, r) => s + (['approved', 'processed'].includes(r.status) ? r.amount : 0), 0),
  };

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Refunds" subtitle="Manage refund requests">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending Review', value: counts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved', value: counts.approved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rejected', value: counts.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Total Refunded', value: `$${counts.total.toFixed(2)}`, icon: RefreshCcw, color: 'text-blue-600', bg: 'bg-blue-50' },
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

        {counts.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium">{counts.pending} refund request{counts.pending !== 1 ? 's' : ''} awaiting your review</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input className="pl-9 h-9" placeholder="Search by refund or order ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Refund ID', 'Order', 'Amount', 'Reason', 'Status', 'Requested', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No refunds found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.order_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-semibold">${r.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{r.reason ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={processing === r.id} onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" disabled={processing === r.id} onClick={() => updateStatus(r.id, 'rejected')}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
