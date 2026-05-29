'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Truck, Search, Ban, Trash2, MapPin, Phone, Mail, Car, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Clock, RefreshCw, ChevronDown, Eye, EyeOff, X, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DeliveryArea {
  id: string;
  name: string;
  slug: string;
  suburbs: string[];
  is_active: boolean;
}

interface Driver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'active' | 'banned' | 'inactive';
  must_change_password: boolean;
  vehicle_type: string;
  vehicle_rego: string;
  notes: string;
  banned_reason: string;
  banned_at: string | null;
  created_at: string;
  state: string;
  area_id: string | null;
  delivery_areas: DeliveryArea | null;
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  banned: { label: 'Banned', color: 'bg-red-100 text-red-700 border-red-200', icon: Ban },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock },
};

const VEHICLE_TYPES = ['car', 'van', 'truck', 'motorbike'];

const AU_STATES = [
  { code: 'VIC', name: 'Victoria' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA',  name: 'Western Australia' },
  { code: 'SA',  name: 'South Australia' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'NT',  name: 'Northern Territory' },
];

export default function AdminDriversPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState<Driver | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Driver | null>(null);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState<Driver | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit vehicle form
  const [vehicleForm, setVehicleForm] = useState({ vehicle_type: 'car', vehicle_rego: '' });

  // Add driver form
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    phone: '', state: '', vehicle_type: 'car', vehicle_rego: '', notes: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Ban form
  const [banReason, setBanReason] = useState('');

  // Add area form
  const [areaForm, setAreaForm] = useState({ name: '', slug: '', suburbs_raw: '' });

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('delivery_driver_accounts')
      .select('*, delivery_areas(id, name, slug, suburbs, is_active)')
      .order('created_at', { ascending: false });
    setDrivers((data ?? []) as Driver[]);
    setLoading(false);
  }, [supabase]);

  const fetchAreas = useCallback(async () => {
    const { data } = await supabase.from('delivery_areas').select('*').order('name');
    setAreas((data ?? []) as DeliveryArea[]);
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) { fetchDrivers(); fetchAreas(); }
  }, [isAdmin, fetchDrivers, fetchAreas]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'Required';
    if (!form.last_name.trim()) errs.last_name = 'Required';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';
    if (!form.state) errs.state = 'Select a state';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddDriver = async () => {
    if (!validateForm()) return;
    setActionLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${supabaseUrl}/functions/v1/create-driver-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create driver');
      toast({ title: 'Driver account created', description: `${form.first_name} ${form.last_name} can now log in at /driver-dashboard/login` });
      setShowAddModal(false);
      setForm({ first_name: '', last_name: '', email: '', password: '', phone: '', state: '', vehicle_type: 'car', vehicle_rego: '', notes: '' });
      await fetchDrivers();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanDriver = async () => {
    if (!showBanModal) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('delivery_driver_accounts')
      .update({ status: 'banned', banned_at: new Date().toISOString(), banned_reason: banReason })
      .eq('id', showBanModal.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${showBanModal.first_name} has been banned` });
      setShowBanModal(null);
      setBanReason('');
      await fetchDrivers();
    }
    setActionLoading(false);
  };

  const handleUnban = async (driver: Driver) => {
    const { error } = await supabase
      .from('delivery_driver_accounts')
      .update({ status: 'active', banned_at: null, banned_reason: '' })
      .eq('id', driver.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `${driver.first_name} has been unbanned` }); await fetchDrivers(); }
  };

  const handleDeleteDriver = async () => {
    if (!showDeleteModal) return;
    setActionLoading(true);
    // Delete driver account record (cascade deletes auth user via FK is not set up,
    // so we use service role via edge fn — for now just soft-delete to inactive)
    const { error } = await supabase
      .from('delivery_driver_accounts')
      .update({ status: 'inactive' })
      .eq('id', showDeleteModal.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Driver removed', description: 'Account set to inactive' });
      setShowDeleteModal(null);
      await fetchDrivers();
    }
    setActionLoading(false);
  };

  const handleAddArea = async () => {
    if (!areaForm.name.trim() || !areaForm.slug.trim()) {
      toast({ title: 'Name and slug are required', variant: 'destructive' }); return;
    }
    const suburbs = areaForm.suburbs_raw.split(',').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from('delivery_areas').insert({
      name: areaForm.name.trim(),
      slug: areaForm.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      suburbs,
      is_active: true,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `Area "${areaForm.name}" created` });
      setAreaForm({ name: '', slug: '', suburbs_raw: '' });
      setShowAreaModal(false);
      await fetchAreas();
    }
  };

  const handleEditVehicle = async () => {
    if (!showEditVehicleModal) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('delivery_driver_accounts')
      .update({ vehicle_type: vehicleForm.vehicle_type, vehicle_rego: vehicleForm.vehicle_rego.trim() })
      .eq('id', showEditVehicleModal.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vehicle updated', description: `${showEditVehicleModal.first_name}'s vehicle details have been updated.` });
      setShowEditVehicleModal(null);
      await fetchDrivers();
    }
    setActionLoading(false);
  };

  const filtered = drivers.filter(d => {
    const matchSearch = !search ||
      `${d.first_name} ${d.last_name} ${d.email}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    banned: drivers.filter(d => d.status === 'banned').length,
    mustChange: drivers.filter(d => d.must_change_password && d.status === 'active').length,
  };

  if (adminLoading) return null;
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <p className="text-white">Access denied</p>
    </div>
  );

  return (
    <AdminBaazarShell title="Delivery Drivers" subtitle="Manage driver accounts, areas and access">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Drivers', value: stats.total, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-900/30' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/30' },
          { label: 'Banned', value: stats.banned, icon: Ban, color: 'text-red-400', bg: 'bg-red-900/30' },
          { label: 'Password Pending', value: stats.mustChange, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-900/30' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'banned', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
                statusFilter === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
              )}
            >{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAreaModal(true)}
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 gap-1.5"
          >
            <MapPin className="w-4 h-4" /> Manage Areas
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            size="sm"
          >
            <UserPlus className="w-4 h-4" /> Add Driver
          </Button>
        </div>
      </div>

      {/* Driver cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No drivers found</p>
          <p className="text-gray-600 text-sm mt-1">Add your first driver to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(driver => {
            const s = STATUS_CONFIG[driver.status];
            const StatusIcon = s.icon;
            return (
              <div key={driver.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-700/30 border border-emerald-700/50 flex items-center justify-center text-emerald-400 font-bold text-lg flex-shrink-0">
                      {driver.first_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{driver.first_name} {driver.last_name}</p>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', s.color)}>
                        <StatusIcon className="w-3 h-3" /> {s.label}
                      </span>
                    </div>
                  </div>
                  {driver.must_change_password && driver.status === 'active' && (
                    <span className="px-2 py-0.5 bg-amber-900/40 border border-amber-700/50 text-amber-400 text-[10px] rounded-full font-medium">
                      Pw Pending
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{driver.email}</span>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{driver.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {driver.state ? (
                      <span className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs font-bold rounded-md tracking-wide">
                          {driver.state}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {AU_STATES.find(s => s.code === driver.state)?.name ?? driver.state}
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-600 italic text-sm">No state assigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Car className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="capitalize">{driver.vehicle_type}{driver.vehicle_rego ? ` · ${driver.vehicle_rego}` : ''}</span>
                  </div>
                </div>

                {driver.status === 'banned' && driver.banned_reason && (
                  <div className="px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg text-xs text-red-400">
                    Banned: {driver.banned_reason}
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t border-gray-700">
                  <button
                    onClick={() => { setVehicleForm({ vehicle_type: driver.vehicle_type || 'car', vehicle_rego: driver.vehicle_rego || '' }); setShowEditVehicleModal(driver); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-900/40"
                    title="Edit vehicle details"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Vehicle
                  </button>
                  {driver.status === 'active' ? (
                    <button
                      onClick={() => setShowBanModal(driver)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors border border-red-900/40"
                    >
                      <Ban className="w-3.5 h-3.5" /> Ban
                    </button>
                  ) : driver.status === 'banned' ? (
                    <button
                      onClick={() => handleUnban(driver)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/20 rounded-lg transition-colors border border-green-900/40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Unban
                    </button>
                  ) : null}
                  <button
                    onClick={() => setShowDeleteModal(driver)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Vehicle Modal ── */}
      {showEditVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h2 className="text-white font-bold text-lg">Edit Vehicle Details</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {showEditVehicleModal.first_name} {showEditVehicleModal.last_name}
                </p>
              </div>
              <button onClick={() => setShowEditVehicleModal(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-800/40 rounded-xl">
                <Car className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-blue-300 text-xs">Update the driver&apos;s vehicle type and registration plate. The driver will see these changes immediately.</p>
              </div>
              <Field label="Vehicle Type">
                <select
                  value={vehicleForm.vehicle_type}
                  onChange={e => setVehicleForm(f => ({ ...f, vehicle_type: e.target.value }))}
                  className="admin-input"
                >
                  {VEHICLE_TYPES.map(v => (
                    <option key={v} value={v} className="capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Vehicle Registration">
                <input
                  value={vehicleForm.vehicle_rego}
                  onChange={e => setVehicleForm(f => ({ ...f, vehicle_rego: e.target.value.toUpperCase() }))}
                  className="admin-input"
                  placeholder="e.g. ABC123"
                  maxLength={10}
                />
              </Field>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowEditVehicleModal(null)}
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button onClick={handleEditVehicle} disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                Save Vehicle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Driver Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h2 className="text-white font-bold text-lg">Add Delivery Driver</h2>
                <p className="text-gray-400 text-sm mt-0.5">Create a new driver account</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" error={formErrors.first_name}>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="admin-input" placeholder="John" />
                </Field>
                <Field label="Last Name" error={formErrors.last_name}>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="admin-input" placeholder="Smith" />
                </Field>
              </div>
              <Field label="Email" error={formErrors.email}>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="admin-input" placeholder="driver@example.com" />
              </Field>
              <Field label="Temporary Password" error={formErrors.password}>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="admin-input pr-10" placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">Driver must change this on first login</p>
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="admin-input" placeholder="+61 4xx xxx xxx" />
              </Field>
              <Field label="State" error={formErrors.state}>
                <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className="admin-input">
                  <option value="">Select state...</option>
                  {AU_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vehicle Type">
                  <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                    className="admin-input">
                    {VEHICLE_TYPES.map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                  </select>
                </Field>
                <Field label="Vehicle Rego">
                  <input value={form.vehicle_rego} onChange={e => setForm(f => ({ ...f, vehicle_rego: e.target.value }))}
                    className="admin-input" placeholder="ABC123" />
                </Field>
              </div>
              <Field label="Notes (admin only)">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="admin-input resize-none" rows={2} placeholder="Optional notes..." />
              </Field>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button onClick={handleAddDriver} disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create Driver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ban Modal ── */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">Ban Driver</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Ban <span className="text-white">{showBanModal.first_name} {showBanModal.last_name}</span>? They won't be able to access their dashboard or pick up orders.
              </p>
            </div>
            <div className="p-5">
              <label className="block text-sm text-gray-400 mb-1.5">Reason (optional)</label>
              <textarea
                value={banReason} onChange={e => setBanReason(e.target.value)}
                className="admin-input resize-none" rows={3} placeholder="Reason for banning..." />
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowBanModal(null)}
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button onClick={handleBanDriver} disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white gap-2">
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirm Ban
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5">
              <h2 className="text-white font-bold text-lg mb-2">Remove Driver</h2>
              <p className="text-gray-400 text-sm">
                Remove <span className="text-white">{showDeleteModal.first_name} {showDeleteModal.last_name}</span>? Their account will be deactivated and they won't be able to log in.
              </p>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteModal(null)}
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button onClick={handleDeleteDriver} disabled={actionLoading}
                className="bg-red-700 hover:bg-red-800 text-white gap-2">
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove Driver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Areas Modal ── */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-lg">Delivery Areas</h2>
                <p className="text-gray-400 text-sm mt-0.5">Manage regions and covered suburbs</p>
              </div>
              <button onClick={() => setShowAreaModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {areas.map(area => (
                <div key={area.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="text-white font-semibold">{area.name}</span>
                      <span className="text-gray-500 text-xs">/{area.slug}</span>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium',
                      area.is_active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-500'
                    )}>
                      {area.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {area.suburbs.length > 0
                      ? `${area.suburbs.slice(0, 5).join(', ')}${area.suburbs.length > 5 ? ` +${area.suburbs.length - 5} more` : ''}`
                      : 'No suburbs configured'}
                  </p>
                </div>
              ))}
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" /> Add New Area
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Area Name">
                      <input value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                        className="admin-input" placeholder="e.g. Melbourne" />
                    </Field>
                    <Field label="Slug">
                      <input value={areaForm.slug} onChange={e => setAreaForm(f => ({ ...f, slug: e.target.value }))}
                        className="admin-input" placeholder="e.g. melbourne" />
                    </Field>
                  </div>
                  <Field label="Suburbs (comma-separated)">
                    <textarea value={areaForm.suburbs_raw} onChange={e => setAreaForm(f => ({ ...f, suburbs_raw: e.target.value }))}
                      className="admin-input resize-none" rows={3} placeholder="Suburb 1, Suburb 2, ..." />
                  </Field>
                  <Button onClick={handleAddArea} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-1.5" /> Add Area
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .admin-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          color: #f9fafb;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .admin-input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.15);
        }
        .admin-input option {
          background: #1f2937;
        }
      `}</style>
    </AdminBaazarShell>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
