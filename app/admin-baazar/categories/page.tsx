'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Plus, Pencil, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Category {
  id: string; name: string; slug: string; description: string; is_active: boolean;
  is_featured: boolean; sort_order: number; parent_id: string | null; created_at: string;
}

export default function AdminBaazarCategoriesPage() {
  const { checking } = useAdmin();
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', is_active: true, is_featured: false, sort_order: 0, parent_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (!checking) load(); }, [checking]);

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const openNew = () => { setEditing(null); setForm({ name: '', slug: '', description: '', is_active: true, is_featured: false, sort_order: 0, parent_id: '' }); setShowForm(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setForm({ name: cat.name, slug: cat.slug, description: cat.description, is_active: cat.is_active, is_featured: cat.is_featured, sort_order: cat.sort_order, parent_id: cat.parent_id ?? '' }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, slug: form.slug || autoSlug(form.name), parent_id: form.parent_id || null };
    if (editing) await supabase.from('categories').update(payload).eq('id', editing.id);
    else await supabase.from('categories').insert(payload);
    setSaving(false); setShowForm(false); load();
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const topLevel = categories.filter(c => !c.parent_id);

  return (
    <AdminBaazarShell title="Categories" subtitle={`${categories.length} categories`}>
      <div className="flex justify-end mb-5">
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">{editing ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))} placeholder="e.g. Halal Meat" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Slug</label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Parent Category</label>
              <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-background">
                <option value="">None (top-level)</option>
                {topLevel.filter(c => !editing || c.id !== editing.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sort Order</label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="h-9 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /> Active</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded" /> Featured</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.name} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
              <Check className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Category'}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Parent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Featured</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading...</td></tr>
                : categories.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No categories yet. Add one above.</td></tr>
                : categories.map(cat => {
                  const parent = cat.parent_id ? categories.find(c => c.id === cat.parent_id) : null;
                  return (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-xs">{cat.parent_id && <span className="text-gray-300 mr-1">└</span>}{cat.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{cat.slug}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{parent?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', cat.is_active ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200')}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{cat.is_featured ? 'Yes' : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
