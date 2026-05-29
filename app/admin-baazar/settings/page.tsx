'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { Settings, Save, Store, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type SettingsMap = Record<string, string>;

export default function AdminSettingsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('platform_settings').select('key, value').then(({ data }) => {
      if (data) {
        const map: SettingsMap = {};
        data.forEach(r => { map[r.key] = r.value; });
        setSettings(map);
      }
      setLoaded(true);
    });
  }, [isAdmin, supabase]);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));
  const setBool = (key: string, checked: boolean) => setSettings(prev => ({ ...prev, [key]: checked ? 'true' : 'false' }));

  const handleSave = async () => {
    setSaving(true);
    const upserts = Object.entries(settings).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('platform_settings').upsert(upserts, { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully' });
    }
  };

  if (adminLoading || !loaded) return null;

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );

  return (
    <AdminBaazarShell title="Settings" subtitle="Platform configuration and preferences">
      <div className="space-y-6 max-w-3xl">
        <Section title="General" icon={Store}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Site Name</Label>
              <Input className="mt-1.5 h-9" value={settings.site_name ?? ''} onChange={e => set('site_name', e.target.value)} />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input className="mt-1.5 h-9" type="email" value={settings.site_email ?? ''} onChange={e => set('site_email', e.target.value)} />
            </div>
            <div>
              <Label>Support Phone</Label>
              <Input className="mt-1.5 h-9" value={settings.site_phone ?? ''} onChange={e => set('site_phone', e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <select value={settings.currency ?? 'AUD'} onChange={e => set('currency', e.target.value)} className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div>
              <Label>Timezone</Label>
              <select value={settings.timezone ?? 'Australia/Sydney'} onChange={e => set('timezone', e.target.value)} className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Australia/Melbourne">Australia/Melbourne</option>
                <option value="Australia/Brisbane">Australia/Brisbane</option>
                <option value="Australia/Perth">Australia/Perth</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title="Delivery" icon={Truck}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Free Delivery Threshold ($)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input className="pl-7 h-9" type="number" value={settings.free_delivery_threshold ?? '80'} onChange={e => set('free_delivery_threshold', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Standard Delivery Fee ($)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input className="pl-7 h-9" type="number" step="0.01" value={settings.standard_delivery_fee ?? '9.99'} onChange={e => set('standard_delivery_fee', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Express Delivery Fee ($)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input className="pl-7 h-9" type="number" step="0.01" value={settings.express_delivery_fee ?? '19.99'} onChange={e => set('express_delivery_fee', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Same-Day Order Cutoff</Label>
              <Input className="mt-1.5 h-9" type="time" value={settings.same_day_cutoff ?? '12:00'} onChange={e => set('same_day_cutoff', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Delivery Cities (comma separated)</Label>
              <Input className="mt-1.5 h-9" value={settings.delivery_cities ?? ''} onChange={e => set('delivery_cities', e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Seller Settings" icon={Store}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Default Commission Rate (%)</Label>
              <div className="relative mt-1.5">
                <Input className="pr-8 h-9" type="number" min="0" max="50" value={settings.default_commission_rate ?? '10'} onChange={e => set('default_commission_rate', e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <Label>Minimum Payout Amount ($)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input className="pl-7 h-9" type="number" value={settings.min_payout_amount ?? '50'} onChange={e => set('min_payout_amount', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={settings.approval_required === 'true'} onChange={e => setBool('approval_required', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm text-gray-700">Require admin approval for new seller applications</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={settings.product_approval_required === 'true'} onChange={e => setBool('product_approval_required', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm text-gray-700">Require admin approval for new product listings</span>
            </label>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
