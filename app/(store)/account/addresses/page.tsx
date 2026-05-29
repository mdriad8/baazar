'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Plus, Trash2, Pencil, Chrome as Home, Building2, CircleCheck as CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AccountLayout from '@/components/account/AccountLayout';

interface Address {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  is_default: boolean;
}

const BLANK: Omit<Address, 'id' | 'is_default'> = {
  label: 'Home',
  first_name: '',
  last_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'Australia',
};

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

export default function AddressesPage() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const fetchAddresses = async () => {
    if (!user) return;
    setFetching(true);
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });
    setAddresses(data ?? []);
    setFetching(false);
  };

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...BLANK });
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    setForm({
      label: addr.label,
      first_name: addr.first_name ?? '',
      last_name: addr.last_name ?? '',
      phone: addr.phone ?? '',
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 ?? '',
      suburb: addr.suburb,
      state: addr.state,
      postcode: addr.postcode,
      country: addr.country ?? 'Australia',
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    if (editing) {
      await supabase.from('customer_addresses').update(form).eq('id', editing.id);
      toast({ title: 'Address updated' });
    } else {
      const isFirst = addresses.length === 0;
      await supabase.from('customer_addresses').insert({ ...form, user_id: user.id, is_default: isFirst });
      toast({ title: 'Address added' });
    }
    setSaving(false);
    setShowForm(false);
    fetchAddresses();
  };

  const remove = async (id: string) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Address removed' });
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    fetchAddresses();
  };

  if (loading) return (
    <AccountLayout>
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
        ))}
      </div>
    </AccountLayout>
  );
  if (!user) return null;

  return (
    <AccountLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Addresses</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{addresses.length} saved {addresses.length === 1 ? 'address' : 'addresses'}</p>
          </div>
          {!showForm && (
            <Button onClick={openNew} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm" size="sm">
              <Plus className="w-4 h-4" /> Add Address
            </Button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5">{editing ? 'Edit Address' : 'Add New Address'}</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Label</Label>
                <div className="flex gap-2 mt-1.5">
                  {['Home', 'Work', 'Other'].map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, label: lbl }))}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        form.label === lbl
                          ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {lbl === 'Home' ? <Home className="w-3.5 h-3.5" /> : lbl === 'Work' ? <Building2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input className="mt-1.5 h-10" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input className="mt-1.5 h-10" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1.5 h-10" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Address Line 1</Label>
                <Input className="mt-1.5 h-10" value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} placeholder="Street number and name" required />
              </div>
              <div>
                <Label>Address Line 2 <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input className="mt-1.5 h-10" value={form.address_line2} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} placeholder="Apartment, unit, suite, etc." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label>Suburb</Label>
                  <Input className="mt-1.5 h-10" value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} required />
                </div>
                <div>
                  <Label>State</Label>
                  <select
                    value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    className="mt-1.5 h-10 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                    required
                  >
                    <option value="">Select</option>
                    {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Postcode</Label>
                  <Input className="mt-1.5 h-10" value={form.postcode} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} maxLength={4} pattern="[0-9]{4}" required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
                  {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> {editing ? 'Save Changes' : 'Add Address'}</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {fetching ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-blue-300" />
            </div>
            <h2 className="font-bold text-gray-900 mb-2">No saved addresses</h2>
            <p className="text-sm text-muted-foreground mb-5">Add a delivery address to speed up checkout.</p>
            <Button onClick={openNew} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Your First Address
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={cn(
                'bg-white rounded-2xl border shadow-sm p-5 transition-all',
                addr.is_default ? 'border-[hsl(var(--primary))]/30' : 'border-gray-100'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                      addr.is_default ? 'bg-[hsl(var(--secondary))]' : 'bg-gray-50'
                    )}>
                      {addr.label === 'Work' ? (
                        <Building2 className={cn('w-4 h-4', addr.is_default ? 'text-[hsl(var(--primary))]' : 'text-gray-400')} />
                      ) : (
                        <Home className={cn('w-4 h-4', addr.is_default ? 'text-[hsl(var(--primary))]' : 'text-gray-400')} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{addr.label}</p>
                        {addr.is_default && (
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] rounded-full border border-[hsl(var(--primary))]/20">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{addr.first_name} {addr.last_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}<br />
                        {addr.suburb} {addr.state} {addr.postcode}, {addr.country}
                      </p>
                      {addr.phone && <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!addr.is_default && (
                      <button
                        onClick={() => setDefault(addr.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(addr)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(addr.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
