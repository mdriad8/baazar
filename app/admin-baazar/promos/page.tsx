'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { Plus, Percent, DollarSign, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  type: string;
  discount_value: number;
  minimum_order_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromosPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'percentage',
    discount_value: '',
    minimum_order_amount: '',
    usage_limit: '',
    end_date: '',
  });

  const load = async () => {
    const { data } = await supabase
      .from('promo_codes')
      .select('id, code, type, discount_value, minimum_order_amount, usage_limit, usage_count, end_date, is_active, created_at')
      .order('created_at', { ascending: false });
    setPromos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, supabase]);

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) return;
    setSaving(true);
    const { error } = await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase().trim(),
      type: form.type,
      discount_value: parseFloat(form.discount_value),
      minimum_order_amount: form.minimum_order_amount ? parseFloat(form.minimum_order_amount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      end_date: form.end_date || null,
      is_active: true,
      usage_count: 0,
    });
    if (error) {
      toast({ title: 'Error creating promo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Promo code created' });
      setForm({ code: '', type: 'percentage', discount_value: '', minimum_order_amount: '', usage_limit: '', end_date: '' });
      setShowForm(false);
      await load();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id);
    await load();
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Delete this promo code?')) return;
    await supabase.from('promo_codes').delete().eq('id', id);
    await load();
    toast({ title: 'Promo code deleted' });
  };

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Promo Codes" subtitle="Create and manage discount codes">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(v => !v)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Create Promo Code'}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">New Promo Code</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Code <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-9 uppercase" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. SAVE20" />
              </div>
              <div>
                <Label>Discount Type</Label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <Label>Discount Value <span className="text-red-500">*</span></Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{form.type === 'percentage' ? '%' : '$'}</span>
                  <Input className="pl-7 h-9" type="number" min="0" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div>
                <Label>Min Order Amount</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input className="pl-7 h-9" type="number" min="0" value={form.minimum_order_amount} onChange={e => setForm(f => ({ ...f, minimum_order_amount: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <div>
                <Label>Max Uses</Label>
                <Input className="mt-1.5 h-9" type="number" min="1" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="Unlimited" />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input className="mt-1.5 h-9" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={handleCreate} disabled={saving || !form.code || !form.discount_value} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? 'Creating...' : 'Create Code'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">All Promo Codes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : promos.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No promo codes yet</td></tr>
                ) : promos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{p.code}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-600 capitalize">
                        {p.type === 'percentage' ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{p.type === 'percentage' ? `${p.discount_value}%` : `$${p.discount_value}`}</td>
                    <td className="px-4 py-3 text-gray-600">{p.minimum_order_amount ? `$${p.minimum_order_amount}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.usage_count}{p.usage_limit ? ` / ${p.usage_limit}` : ''}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.end_date ? new Date(p.end_date).toLocaleDateString() : 'No expiry'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActive(p.id, p.is_active)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" title={p.is_active ? 'Deactivate' : 'Activate'}>
                          {p.is_active ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deletePromo(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
