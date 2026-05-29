'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Bell, CircleCheck as CheckCircle2 } from 'lucide-react';
import AccountLayout from '@/components/account/AccountLayout';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [profile, setProfile] = useState({ first_name: '', last_name: '', phone: '' });
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ email_orders: true, email_promos: true, sms: false });

  useEffect(() => {
    if (!user) return;
    supabase.from('customer_profiles')
      .select('first_name, last_name, phone, notification_email_orders, notification_email_promos, notification_sms')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({ first_name: data.first_name ?? '', last_name: data.last_name ?? '', phone: data.phone ?? '' });
          setNotifPrefs({
            email_orders: data.notification_email_orders ?? true,
            email_promos: data.notification_email_promos ?? true,
            sms: data.notification_sms ?? false,
          });
        }
      });
  }, [user, supabase]);

  const saveNotifPrefs = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('customer_profiles').update({
      notification_email_orders: notifPrefs.email_orders,
      notification_email_promos: notifPrefs.email_promos,
      notification_sms: notifPrefs.sms,
    }).eq('user_id', user.id);
    setSaving(false);
    toast({ title: 'Preferences saved' });
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('customer_profiles').update(profile).eq('user_id', user.id);
    setSaving(false);
    toast({ title: 'Profile updated successfully' });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setSaving(false);
    if (error) {
      toast({ title: 'Password change failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password changed successfully' });
      setPasswords({ new: '', confirm: '' });
    }
  };

  if (loading) return (
    <AccountLayout>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32" />
        ))}
      </div>
    </AccountLayout>
  );
  if (!user) return null;

  return (
    <AccountLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and preferences</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold mb-5 flex items-center gap-2"><User className="w-4 h-4 text-[hsl(var(--primary))]" /> Personal Information</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input className="mt-1.5 h-10" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input className="mt-1.5 h-10" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Email address</Label>
              <Input className="mt-1.5 h-10 bg-gray-50 cursor-not-allowed" value={user.email} disabled readOnly />
              <p className="text-xs text-muted-foreground mt-1">Contact support to change your email address</p>
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input className="mt-1.5 h-10" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <Button type="submit" disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
              {saving ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold mb-5 flex items-center gap-2"><Lock className="w-4 h-4 text-[hsl(var(--primary))]" /> Change Password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input className="mt-1.5 h-10" type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input className="mt-1.5 h-10" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
            </div>
            <Button type="submit" disabled={saving} variant="outline" className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]">
              Update Password
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold mb-5 flex items-center gap-2"><Bell className="w-4 h-4 text-[hsl(var(--primary))]" /> Notification Preferences</h2>
          <div className="space-y-3">
            {([
              { label: 'Order updates via email', key: 'email_orders' as const },
              { label: 'Promotional emails & deals', key: 'email_promos' as const },
              { label: 'SMS order notifications', key: 'sms' as const },
            ] as { label: string; key: keyof typeof notifPrefs }[]).map(item => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">{item.label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[item.key]}
                  onChange={e => setNotifPrefs(p => ({ ...p, [item.key]: e.target.checked }))}
                  className="w-4 h-4 accent-[hsl(var(--primary))]"
                />
              </label>
            ))}
          </div>
          <Button onClick={saveNotifPrefs} disabled={saving} className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white" size="sm">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </AccountLayout>
  );
}
