'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Truck, MapPin, Package, CircleCheck as CheckCircle2, Clock,
  CircleAlert as AlertCircle, LogOut, RefreshCw, Phone,
  Navigation, Eye, EyeOff, Loader as Loader2, Lock, ShieldCheck,
  ChevronRight, ExternalLink, User, Bike, Car, LocateFixed,
  Settings, Camera, Save, Mail, KeyRound, ChevronLeft, X,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AU_STATE_NAMES: Record<string, string> = {
  VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland',
  WA: 'Western Australia', SA: 'South Australia', ACT: 'Australian Capital Territory',
  TAS: 'Tasmania', NT: 'Northern Territory',
};

interface DriverAccount {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  status: 'active' | 'banned' | 'inactive';
  must_change_password: boolean;
  vehicle_type: string;
  vehicle_rego: string;
  state: string;
  area_id: string | null;
  delivery_areas: { id: string; name: string; slug: string } | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  delivery_address: Record<string, string>;
  driver_id: string | null;
  created_at: string;
  contact_email: string;
  contact_phone: string;
  customer_name: string;
  driver_name: string | null;
  driver_phone: string | null;
  delivery_failure_note: string | null;
}

const DRIVER_STATUSES = [
  { value: 'picking',          label: 'Picking',          icon: Package,      activeColor: 'text-amber-700 bg-amber-50 border-amber-300',    btnColor: 'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700' },
  { value: 'packing',          label: 'Packing',          icon: Package,      activeColor: 'text-amber-700 bg-amber-50 border-amber-300',    btnColor: 'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700' },
  { value: 'dispatch_ready',   label: 'Ready',            icon: CheckCircle2, activeColor: 'text-teal-700 bg-teal-50 border-teal-300',       btnColor: 'hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700' },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: Truck,        activeColor: 'text-orange-700 bg-orange-50 border-orange-300', btnColor: 'hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700' },
  { value: 'nearby',           label: 'Nearby',           icon: LocateFixed,  activeColor: 'text-orange-600 bg-orange-50 border-orange-300', btnColor: 'hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600' },
  { value: 'delivered',        label: 'Delivered',        icon: ShieldCheck,  activeColor: 'text-emerald-700 bg-emerald-50 border-emerald-300', btnColor: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700' },
  { value: 'failed_delivery',  label: 'Failed',           icon: AlertCircle,  activeColor: 'text-red-700 bg-red-50 border-red-300',          btnColor: 'hover:bg-red-50 hover:border-red-300 hover:text-red-700' },
];

const PICKUP_STATUSES = ['placed', 'payment_confirmed', 'payment_authorised', 'stock_allocated', 'picking', 'packing', 'qc_ready', 'dispatch_ready'];
const TERMINAL_STATUSES = ['delivered', 'failed_delivery', 'cancelled'];

function getStatusConf(status: string) {
  const s = DRIVER_STATUSES.find(s => s.value === status);
  if (s) return s;
  return { value: status, label: status.replace(/_/g, ' '), icon: Clock, activeColor: 'text-gray-600 bg-gray-50 border-gray-300', btnColor: '' };
}

function openGoogleMaps(addr: Record<string, string>) {
  const parts = [addr.address_line1, addr.suburb, addr.state, addr.postcode, 'Australia'].filter(Boolean);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(', '))}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function VehicleIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'motorbike' || type === 'motorcycle') return <Bike className={className} />;
  return <Car className={className} />;
}

// ── Change Password Screen ─────────────────────────────────────────────────────
function ChangePasswordScreen({ onDone }: { onDone: () => void }) {
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
      if (pwError) { setError(pwError.message); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('delivery_driver_accounts').update({ must_change_password: false }).eq('user_id', user.id);
      onDone();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-gray-900 text-xl font-bold">Set New Password</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">For security, set a new password before continuing.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'New Password', val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm Password', val: confirm, set: setConfirm, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
              <div className="relative">
                <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10 transition" />
                <button type="button" onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-semibold rounded-xl gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Failure Note Modal ─────────────────────────────────────────────────────────
function FailureNoteModal({ order, onConfirm, onCancel }: {
  order: Order;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Red top bar */}
        <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Report Delivery Failure</h3>
                <p className="text-xs text-gray-500 mt-0.5">Order {order.order_number}</p>
              </div>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This note will be visible to the customer, seller, and admin.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-gray-500" />
              Reason for failed delivery
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="e.g. No one was home. Attempted delivery at 3:15 PM. Left a card at the door. Please contact customer to rearrange."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none transition placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">{note.length}/500 characters</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={() => note.trim() ? onConfirm(note.trim()) : null}
              disabled={!note.trim()}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Confirm Failure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Settings Panel ─────────────────────────────────────────────────────
function ProfilePanel({ driver, onClose, onSaved }: { driver: DriverAccount; onClose: () => void; onSaved: (d: DriverAccount) => void }) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(driver.first_name);
  const [lastName, setLastName]   = useState(driver.last_name);
  const [phone, setPhone]         = useState(driver.phone ?? '');
  const [email, setEmail]         = useState(driver.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(driver.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');

  const [showPw, setShowPw]           = useState(false);
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showNewPw, setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwError, setPwError]         = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Fixed path per driver — no extension variation so upsert always hits same object
      const path = `driver-avatars/${driver.user_id}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) { showToast('Upload failed: ' + upErr.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust CDN cache so the new image shows immediately
      setAvatarUrl(publicUrl + '?t=' + Date.now());
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('delivery_driver_accounts').update({
      first_name: firstName.trim(), last_name: lastName.trim(),
      phone: phone.trim(), avatar_url: avatarUrl || null,
    }).eq('user_id', driver.user_id);
    setSaving(false);
    if (error) { showToast('Save failed: ' + error.message); return; }
    if (email.trim() !== driver.email) {
      const { error: authErr } = await supabase.auth.updateUser({ email: email.trim() });
      if (authErr) { showToast('Email update failed: ' + authErr.message); return; }
    }
    onSaved({ ...driver, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(), email: email.trim(), avatar_url: avatarUrl || null });
    showToast('Profile saved!');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setNewPw(''); setConfirmPw(''); setShowPw(false);
    showToast('Password changed!');
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-gray-900">Profile Settings</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Avatar */}
          <div className="bg-gradient-to-b from-emerald-50 to-white px-5 py-8 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-emerald-100">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-emerald-600 text-3xl font-black">{driver.first_name[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md transition">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">{driver.first_name} {driver.last_name}</p>
              <p className="text-gray-500 text-sm capitalize">{driver.vehicle_type} · {driver.vehicle_rego}</p>
            </div>
          </div>

          <div className="px-5 pb-8 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Personal Information</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'First Name', val: firstName, set: setFirstName },
                    { label: 'Last Name', val: lastName, set: setLastName },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <input value={f.val} onChange={e => f.set(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Changing email will send a verification link.</p>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="border-t border-gray-100" />

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Vehicle Details</h3>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                {[
                  { label: 'Vehicle Type', value: driver.vehicle_type },
                  { label: 'Registration', value: driver.vehicle_rego || '—' },
                  { label: 'Zone', value: driver.delivery_areas?.name ?? driver.state ?? '—' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-medium text-gray-800 capitalize">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Vehicle details can only be changed by an admin.</p>
            </div>

            <div className="border-t border-gray-100" />

            <div>
              <button onClick={() => setShowPw(v => !v)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">Change Password</p>
                    <p className="text-xs text-gray-500">Update your login password</p>
                  </div>
                </div>
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', showPw && 'rotate-90')} />
              </button>

              {showPw && (
                <form onSubmit={handleChangePassword} className="mt-3 space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  {[
                    { label: 'New Password', val: newPw, set: setNewPw, show: showNewPw, toggle: () => setShowNewPw(v => !v) },
                    { label: 'Confirm Password', val: confirmPw, set: setConfirmPw, show: showConfirmPw, toggle: () => setShowConfirmPw(v => !v) },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <div className="relative">
                        <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} required
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition pr-10" />
                        <button type="button" onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                          {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {pwError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-xl p-3">{pwError}</p>}
                  <button type="submit" disabled={pwSaving}
                    className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition">
                    {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {pwSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {toast && (
          <div className="absolute bottom-6 left-4 right-4 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({
  order, driverUserId, isUpdating,
  onPickup, onStatusUpdate, onFailedDelivery,
}: {
  order: Order;
  driverUserId: string;
  isUpdating: boolean;
  onPickup: (order: Order) => void;
  onStatusUpdate: (order: Order, status: string) => void;
  onFailedDelivery: (order: Order) => void;
}) {
  const addr = order.delivery_address ?? {};
  const statusConf = getStatusConf(order.status);
  const isMyOrder = order.driver_id === driverUserId;
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const canPickup = !order.driver_id && PICKUP_STATUSES.includes(order.status);
  const StatusIcon = statusConf.icon;
  const addressLine = [addr.address_line1, addr.suburb, addr.state].filter(Boolean).join(', ');

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden transition-all',
      isMyOrder ? 'border-emerald-200 shadow-md shadow-emerald-50' : 'border-gray-200 shadow-sm'
    )}>
      {/* Top accent */}
      {isMyOrder && <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />}

      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-900 font-bold text-sm tracking-wide">{order.order_number}</span>
              {isMyOrder && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Mine</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 text-sm font-medium truncate">{order.customer_name}</span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border', statusConf.activeColor)}>
              <StatusIcon className="w-3 h-3" />
              {statusConf.label}
            </div>
            <span className="text-emerald-600 font-bold text-base">${order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Address button */}
      <button
        onClick={() => openGoogleMaps(addr)}
        className="w-full px-4 py-3 flex items-center gap-3 border-t border-gray-100 hover:bg-gray-50 transition-colors group text-left"
      >
        <div className="w-8 h-8 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
          <MapPin className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 text-sm font-medium leading-tight truncate">{addressLine}</p>
          {addr.postcode && <p className="text-gray-400 text-xs mt-0.5">{addr.postcode} · Tap for directions</p>}
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
      </button>

      {/* Failure note (if failed) */}
      {order.status === 'failed_delivery' && order.delivery_failure_note && (
        <div className="px-4 py-3 border-t border-red-100 bg-red-50">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700 mb-0.5">Failure Note</p>
              <p className="text-xs text-red-600">{order.delivery_failure_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact */}
      {isMyOrder && (order.contact_phone || order.contact_email) && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap items-center gap-3">
          {order.contact_phone && (
            <a href={`tel:${order.contact_phone}`}
              className="flex items-center gap-2 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
              <Phone className="w-3 h-3" /> {order.contact_phone}
            </a>
          )}
          {!order.contact_phone && order.contact_email && (
            <span className="text-xs text-gray-500">{order.contact_email}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        {isUpdating ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            <span className="text-gray-500 text-sm">Updating...</span>
          </div>

        ) : canPickup ? (
          /* ── PICK UP BUTTON ── solid, clearly tappable */
          <button
            onClick={() => onPickup(order)}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100"
          >
            <Truck className="w-4 h-4 flex-shrink-0" />
            <span>Pick Up Order</span>
          </button>

        ) : isMyOrder && isTerminal ? (
          /* ── TERMINAL STATE ── */
          <div className="space-y-2">
            <div className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border',
              order.status === 'delivered'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            )}>
              {order.status === 'delivered'
                ? <><ShieldCheck className="w-4 h-4" /> Order Delivered Successfully</>
                : <><AlertCircle className="w-4 h-4" /> Delivery Failed</>
              }
            </div>
          </div>

        ) : isMyOrder ? (
          /* ── STATUS GRID ── */
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Update Delivery Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DRIVER_STATUSES.map(s => {
                const SIcon = s.icon;
                const isCurrent = order.status === s.value;
                const isFailed = s.value === 'failed_delivery';
                return (
                  <button
                    key={s.value}
                    disabled={isCurrent}
                    onClick={() => isFailed ? onFailedDelivery(order) : onStatusUpdate(order, s.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all active:scale-95',
                      isCurrent
                        ? cn(s.activeColor, 'ring-1 ring-current/30 cursor-default')
                        : cn('bg-white border-gray-200 text-gray-500', s.btnColor)
                    )}
                  >
                    <SIcon className="w-4 h-4" />
                    <span className="leading-tight text-center">{isCurrent && '✓ '}{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        ) : (
          <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            Assigned to another driver
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DriverDashboardPage() {
  const supabase = createClient();

  const [authLoading, setAuthLoading]         = useState(true);
  const [driver, setDriver]                   = useState<DriverAccount | null>(null);
  const [mustChangePassword, setMustChangePw] = useState(false);
  const [orders, setOrders]                   = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading]     = useState(false);
  const [activeTab, setActiveTab]             = useState<'available' | 'mine'>('available');
  const [updatingOrder, setUpdatingOrder]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh]         = useState<Date>(new Date());
  const [showProfile, setShowProfile]         = useState(false);
  const [failureModalOrder, setFailureModalOrder] = useState<Order | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.replace('/driver-dashboard/login'); return; }
      const { data: driverData } = await supabase
        .from('delivery_driver_accounts')
        .select('*, delivery_areas(id, name, slug)')
        .eq('user_id', data.session.user.id)
        .maybeSingle();
      if (!driverData) { await supabase.auth.signOut(); window.location.replace('/driver-dashboard/login'); return; }
      if (driverData.status === 'banned' || driverData.status === 'inactive') {
        await supabase.auth.signOut(); window.location.replace('/driver-dashboard/login'); return;
      }
      setDriver(driverData as DriverAccount);
      setMustChangePw(driverData.must_change_password);
      setAuthLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!driver?.area_id) return;
    setOrdersLoading(true);
    const { data } = await supabase.rpc('get_orders_for_area', { p_area_id: driver.area_id });
    setOrders((data ?? []) as Order[]);
    setLastRefresh(new Date());
    setOrdersLoading(false);
  }, [driver, supabase]);

  useEffect(() => { if (driver && !mustChangePassword) fetchOrders(); }, [driver, mustChangePassword, fetchOrders]);
  useEffect(() => {
    if (!driver || mustChangePassword) return;
    const interval = setInterval(fetchOrders, 60_000);
    return () => clearInterval(interval);
  }, [driver, mustChangePassword, fetchOrders]);

  const handlePickup = async (order: Order) => {
    if (!driver) return;
    setUpdatingOrder(order.id);
    const { error } = await supabase.from('orders')
      .update({ driver_id: driver.user_id, driver_assigned_at: new Date().toISOString(), status: 'out_for_delivery' })
      .eq('id', order.id).is('driver_id', null);
    if (error) alert('Failed to pick up order: ' + error.message);
    else { setActiveTab('mine'); await fetchOrders(); }
    setUpdatingOrder(null);
  };

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    if (!driver) return;
    setUpdatingOrder(order.id);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'delivered') updates.actual_delivery_time = new Date().toISOString();
    const { error, count } = await supabase.from('orders')
      .update(updates, { count: 'exact' })
      .eq('id', order.id)
      .eq('driver_id', driver.user_id);
    if (error) alert('Update failed: ' + error.message);
    else if (count === 0) alert('Update failed: permission denied or order no longer assigned to you.');
    else await fetchOrders();
    setUpdatingOrder(null);
  };

  const handleFailedDelivery = async (order: Order, note: string) => {
    if (!driver) return;
    setFailureModalOrder(null);
    setUpdatingOrder(order.id);
    const { error, count } = await supabase.from('orders')
      .update({ status: 'failed_delivery', delivery_failure_note: note }, { count: 'exact' })
      .eq('id', order.id)
      .eq('driver_id', driver.user_id);
    if (error) alert('Update failed: ' + error.message);
    else if (count === 0) alert('Update failed: permission denied or order no longer assigned to you.');
    else await fetchOrders();
    setUpdatingOrder(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/driver-dashboard/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (mustChangePassword) {
    return <ChangePasswordScreen onDone={() => { setMustChangePw(false); if (driver) setDriver({ ...driver, must_change_password: false }); }} />;
  }

  const myOrders        = orders.filter(o => o.driver_id === driver?.user_id);
  const availableOrders = orders.filter(o => !o.driver_id || o.driver_id !== driver?.user_id);
  const displayOrders   = activeTab === 'mine' ? myOrders : availableOrders;
  const stats = {
    available: availableOrders.length,
    myActive:  myOrders.filter(o => !TERMINAL_STATUSES.includes(o.status)).length,
    delivered: myOrders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">

      {/* Failure modal */}
      {failureModalOrder && (
        <FailureNoteModal
          order={failureModalOrder}
          onConfirm={note => handleFailedDelivery(failureModalOrder, note)}
          onCancel={() => setFailureModalOrder(null)}
        />
      )}

      {/* Profile panel */}
      {showProfile && driver && (
        <ProfilePanel driver={driver} onClose={() => setShowProfile(false)} onSaved={updated => { setDriver(updated); setShowProfile(false); }} />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Truck className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm leading-none">Driver Portal</p>
              <p className="text-emerald-600 text-[11px] mt-0.5 leading-none font-medium">
                {driver?.delivery_areas?.name ?? driver?.state ?? 'No area'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchOrders} disabled={ordersLoading}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className={cn('w-4 h-4', ordersLoading && 'animate-spin text-emerald-500')} />
            </button>
            <button onClick={() => setShowProfile(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* ── Driver card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowProfile(true)} className="flex-shrink-0 relative group">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-200 bg-emerald-50">
                {driver?.avatar_url ? (
                  <Image src={driver.avatar_url} alt="Avatar" width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-emerald-600 text-xl font-black">{driver?.first_name[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-bold text-base leading-tight">{driver?.first_name} {driver?.last_name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  {driver?.state
                    ? <><span className="font-semibold text-emerald-600">{driver.state}</span> · {AU_STATE_NAMES[driver.state] ?? driver.state}</>
                    : driver?.delivery_areas?.name ?? 'Unassigned'}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <VehicleIcon type={driver?.vehicle_type ?? ''} className="w-3 h-3 text-gray-400" />
                  <span className="capitalize">{driver?.vehicle_type}</span>
                  {driver?.vehicle_rego && <span className="text-gray-400">· {driver.vehicle_rego}</span>}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 text-xs font-semibold">Active</span>
              </div>
              <button onClick={() => setShowProfile(true)} className="text-[11px] text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
                <Settings className="w-3 h-3" /> Settings
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Available', value: stats.available, icon: Package, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', tab: 'available' as const },
            { label: 'My Active', value: stats.myActive, icon: Navigation, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', tab: 'mine' as const },
            { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', tab: 'mine' as const },
          ].map(s => (
            <button key={s.label} onClick={() => setActiveTab(s.tab)}
              className={cn('rounded-2xl border p-4 text-center bg-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]', s.border)}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div className={cn('text-2xl font-black tracking-tight', s.color)}>{s.value}</div>
              <div className="text-gray-500 text-[11px] mt-0.5 font-medium">{s.label}</div>
            </button>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 border border-gray-200">
          {([
            { id: 'available', label: 'Available', count: stats.available },
            { id: 'mine',      label: 'My Orders', count: myOrders.length },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                activeTab === tab.id
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                  : 'text-gray-500 hover:text-gray-700'
              )}>
              {tab.label}
              <span className={cn(
                'text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
              )}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between -mt-1">
          <p className="text-gray-400 text-xs">{activeTab === 'available' ? 'Orders in your delivery area' : 'Orders assigned to you'}</p>
          <p className="text-gray-400 text-xs">Updated {lastRefresh.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* ── Orders list ── */}
        {ordersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <p className="text-gray-400 text-sm">Loading orders...</p>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-gray-200 shadow-sm">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold">
              {activeTab === 'available' ? 'No orders available' : 'No active orders'}
            </p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              {activeTab === 'available' ? 'New orders in your area will appear here automatically' : 'Pick up orders from the Available tab'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                driverUserId={driver?.user_id ?? ''}
                isUpdating={updatingOrder === order.id}
                onPickup={handlePickup}
                onStatusUpdate={handleStatusUpdate}
                onFailedDelivery={o => setFailureModalOrder(o)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
