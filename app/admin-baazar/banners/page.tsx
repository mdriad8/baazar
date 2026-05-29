'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { Image as ImageIcon, Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  link_text: string | null;
  position: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function BannersPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', link_url: '', link_text: '' });

  const load = async () => {
    const { data } = await supabase.from('homepage_banners').select('*').order('sort_order');
    setBanners(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, supabase]);

  const handleCreate = async () => {
    if (!form.title || !form.image_url) return;
    setSaving(true);
    const { error } = await supabase.from('homepage_banners').insert({
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url,
      link_url: form.link_url || null,
      link_text: form.link_text || null,
      is_active: true,
      sort_order: banners.length,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Banner created' });
      setForm({ title: '', subtitle: '', image_url: '', link_url: '', link_text: '' });
      setShowForm(false);
      await load();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('homepage_banners').update({ is_active: !current }).eq('id', id);
    await load();
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    await supabase.from('homepage_banners').delete().eq('id', id);
    await load();
    toast({ title: 'Banner deleted' });
  };

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Homepage Banners" subtitle="Manage hero and promotional banners">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(v => !v)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Banner'}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">New Banner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-9" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Ramadan Specials" />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input className="mt-1.5 h-9" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Short tagline" />
              </div>
              <div className="md:col-span-2">
                <Label>Image URL <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-9" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                {form.image_url && (
                  <div className="mt-2 rounded-xl overflow-hidden h-32 bg-gray-100">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <Label>Link URL</Label>
                <Input className="mt-1.5 h-9" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="/products?sale=true" />
              </div>
              <div>
                <Label>CTA Button Text</Label>
                <Input className="mt-1.5 h-9" value={form.link_text} onChange={e => setForm(f => ({ ...f, link_text: e.target.value }))} placeholder="e.g. Shop Now" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={handleCreate} disabled={saving || !form.title || !form.image_url} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? 'Saving...' : 'Add Banner'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
            ))
          ) : banners.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No banners yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your first homepage banner above</p>
            </div>
          ) : banners.map(b => (
            <div key={b.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex ${b.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              <div className="w-2 bg-gray-100 flex items-center justify-center cursor-grab">
                <GripVertical className="w-4 h-4 text-gray-300" />
              </div>
              <div className="w-32 h-20 bg-gray-100 flex-shrink-0 overflow-hidden">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{b.title}</p>
                    {b.subtitle && <p className="text-sm text-gray-500 mt-0.5">{b.subtitle}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      {b.link_url && <span className="text-xs text-blue-600">{b.link_url}</span>}
                      {b.link_text && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{b.link_text}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {b.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => toggleActive(b.id, b.is_active)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title={b.is_active ? 'Hide' : 'Show'}>
                      {b.is_active ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                    </button>
                    <button onClick={() => deleteBanner(b.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminBaazarShell>
  );
}
