'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { DollarSign, TrendingUp, Clock, CircleCheck as CheckCircle2, Circle as XCircle, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  gateway_transaction_id: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
};

export default function PaymentsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, succeeded: 0, pending: 0, failed: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, order_id, amount, currency, status, payment_method, gateway_transaction_id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      const rows = data ?? [];
      setPayments(rows);
      setStats({
        total: rows.reduce((s, p) => s + (['succeeded', 'paid'].includes(p.status) ? p.amount : 0), 0),
        succeeded: rows.filter(p => p.status === 'succeeded').length,
        pending: rows.filter(p => p.status === 'pending').length,
        failed: rows.filter(p => p.status === 'failed').length,
      });
      setLoading(false);
    };
    load();
  }, [isAdmin, supabase]);

  const filtered = payments.filter(p =>
    !search || p.id.includes(search) || p.order_id?.includes(search) || p.gateway_transaction_id?.includes(search)
  );

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Payments" subtitle="All transactions across the platform">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${stats.total.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Succeeded', value: stats.succeeded, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
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

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input className="pl-9 h-9" placeholder="Search by order ID or reference..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const rows = [
                ['Payment ID', 'Order ID', 'Amount', 'Method', 'Status', 'Reference', 'Date'],
                ...filtered.map(p => [
                  p.id, p.order_id ?? '', p.amount.toFixed(2), p.payment_method ?? '',
                  p.status, p.gateway_transaction_id ?? '',
                  new Date(p.created_at).toLocaleDateString('en-AU'),
                ]),
              ];
              const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
              a.click(); URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Payment ID', 'Order ID', 'Amount', 'Method', 'Status', 'Reference', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No payments found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.order_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-semibold">${p.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{p.payment_method?.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.gateway_transaction_id ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
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
