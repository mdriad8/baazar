'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Search, Shield, ShieldOff, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Customer {
  id: string; user_id: string; first_name: string; last_name: string; phone: string;
  total_orders: number; loyalty_points: number; is_blocked: boolean; created_at: string;
}

function CustomerTier({ orders, points }: { orders: number; points: number }) {
  let label: string;
  let color: string;
  if (orders === 0)        { label = 'New';      color = 'text-gray-500 bg-gray-50 border-gray-200'; }
  else if (points < 100)   { label = 'Regular';  color = 'text-blue-600 bg-blue-50 border-blue-200'; }
  else if (points < 500)   { label = 'Silver';   color = 'text-slate-600 bg-slate-50 border-slate-200'; }
  else if (points < 1500)  { label = 'Gold';     color = 'text-amber-600 bg-amber-50 border-amber-200'; }
  else                     { label = 'Platinum'; color = 'text-emerald-700 bg-emerald-50 border-emerald-200'; }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
      <Star className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export default function AdminBaazarCustomersPage() {
  const { checking } = useAdmin();
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customer_profiles').select('id, user_id, first_name, last_name, phone, total_orders, loyalty_points, is_blocked, created_at').order('created_at', { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (!checking) load(); }, [checking]);

  const toggleBlock = async (id: string, blocked: boolean) => {
    await supabase.from('customer_profiles').update({ is_blocked: !blocked }).eq('id', id);
    load();
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <AdminBaazarShell title="Customers" subtitle={`${customers.length} registered customers`}>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." className="pl-9 h-9 text-sm" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Orders</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Tier</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Points</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Joined</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">Loading customers...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No customers found</td></tr>
                : filtered.map(c => (
                  <tr key={c.id} className={cn('hover:bg-gray-50 transition-colors', c.is_blocked && 'bg-red-50/30')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(c.first_name?.[0] ?? '?').toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-xs">{c.first_name} {c.last_name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{c.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{c.total_orders}</td>
                    <td className="px-4 py-3"><CustomerTier orders={c.total_orders} points={c.loyalty_points} /></td>
                    <td className="px-4 py-3 text-xs text-amber-600 font-medium">{c.loyalty_points}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', c.is_blocked ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200')}>
                        {c.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleBlock(c.id, c.is_blocked)}
                        className={cn('text-[11px] px-2.5 py-1 rounded-lg font-medium border transition-colors flex items-center gap-1 ml-auto',
                          c.is_blocked ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100')}>
                        {c.is_blocked ? <><Shield className="w-3 h-3" /> Unblock</> : <><ShieldOff className="w-3 h-3" /> Block</>}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
