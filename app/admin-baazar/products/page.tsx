'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Search, Plus, X, Upload, CircleCheck as CheckCircle2, Circle as XCircle, ChevronDown, Image as ImageIcon, Loader as Loader2, EyeOff, Trash2, Eye, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  status: string;
  stock_status: string;
  stock_quantity: number;
  is_halal: boolean;
  created_at: string;
  seller_profiles: { display_name: string } | null;
  categories: { name: string } | null;
}

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface Seller { id: string; display_name: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  published: { label: 'Published', color: 'text-green-700 bg-green-50 border-green-200' },
  pending_admin_approval: { label: 'Pending Approval', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  draft: { label: 'Draft', color: 'text-gray-600 bg-gray-50 border-gray-200' },
  rejected: { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' },
  archived: { label: 'Archived', color: 'text-gray-500 bg-gray-50 border-gray-100' },
};

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  short_description: '',
  price: '',
  sale_price: '',
  sku: '',
  stock_quantity: '',
  category_id: '',
  brand_id: '',
  seller_id: '',
  status: 'published',
  is_halal: false,
  is_featured: false,
  is_trending: false,
  country_of_origin: '',
  unit_type: 'each',
  storage_type: 'ambient',
  image_url: '',
  quantity_step: '1',
  min_order_qty: '1',
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AdminBaazarProductsPage() {
  const { checking } = useAdmin();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editImages, setEditImages] = useState<Array<{id: string; url: string; uploading: boolean}>>([{ id: 'ei-0', url: '', uploading: false }]);
  const editFileInputs = useRef<Map<string, HTMLInputElement>>(new Map());
  const editSlotCounter = useRef(0);
  const newEditSlot = useCallback((url = '') => ({ id: `ei-${++editSlotCounter.current}`, url, uploading: false }), []);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('products')
      .select('id, name, slug, price, status, stock_status, stock_quantity, is_halal, created_at, seller_profiles(display_name), categories(name)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setProducts((data as unknown as Product[]) ?? []);
    setLoading(false);
  };

  const loadMeta = async () => {
    const [{ data: cats }, { data: brnds }, { data: sellrs }] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('seller_profiles').select('id, display_name').eq('status', 'approved').order('display_name'),
    ]);
    setCategories(cats ?? []);
    setBrands(brnds ?? []);
    setSellers((sellrs as Seller[]) ?? []);
  };

  useEffect(() => { if (!checking) { load(); loadMeta(); } }, [checking, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('products').update({ status }).eq('id', id);
    load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await supabase.from('product_images').delete().eq('product_id', confirmDelete.id);
    await supabase.from('products').delete().eq('id', confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    load();
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleNameChange = (v: string) => {
    setForm(f => ({ ...f, name: v, slug: slugify(v) }));
  };

  const handleImageFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `products/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      set('image_url', urlData.publicUrl);
      setImagePreview(urlData.publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaveError('');
    if (!form.name.trim()) { setSaveError('Product name is required.'); return; }
    if (!form.price || isNaN(Number(form.price))) { setSaveError('A valid price is required.'); return; }
    if (!form.category_id) { setSaveError('Please select a category.'); return; }

    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      short_description: form.short_description || null,
      price: Number(form.price),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      sku: form.sku || null,
      stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : 0,
      stock_status: Number(form.stock_quantity) > 0 ? 'in_stock' : 'out_of_stock',
      category_id: form.category_id,
      brand_id: form.brand_id || null,
      seller_id: form.seller_id || null,
      status: form.status,
      is_halal: form.is_halal,
      is_featured: form.is_featured,
      is_trending: form.is_trending,
      country_of_origin: form.country_of_origin || null,
      unit_type: form.unit_type,
      storage_type: form.storage_type,
      quantity_step: parseFloat(form.quantity_step) || 1,
      min_order_qty: parseFloat(form.min_order_qty) || 1,
    };

    const { data: inserted, error } = await supabase.from('products').insert(payload).select('id').single();
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    if (form.image_url && inserted?.id) {
      await supabase.from('product_images').insert({
        product_id: inserted.id,
        image_url: form.image_url,
        alt_text: form.name,
        sort_order: 0,
        is_primary: true,
      });
    }

    setSaving(false);
    setShowModal(false);
    setForm({ ...EMPTY_FORM });
    setImagePreview('');
    load();
  };

  const openModal = () => { setForm({ ...EMPTY_FORM }); setImagePreview(''); setSaveError(''); setShowModal(true); };

  const handleEditImageFile = async (file: File, slotId: string) => {
    setEditImages(prev => prev.map(s => s.id === slotId ? { ...s, uploading: true } : s));
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setEditImages(prev => prev.map(s => s.id === slotId ? { ...s, url: urlData.publicUrl, uploading: false } : s));
    } else {
      setEditImages(prev => prev.map(s => s.id === slotId ? { ...s, uploading: false } : s));
    }
    const input = editFileInputs.current.get(slotId);
    if (input) input.value = '';
  };

  const openEdit = async (p: Product) => {
    setEditError('');
    const { data: full } = await supabase.from('products').select('*, product_images(image_url, is_primary, sort_order)').eq('id', p.id).maybeSingle();
    if (!full) return;
    const imgs = ((full as Record<string, unknown>).product_images as Array<{image_url: string; is_primary: boolean; sort_order: number}> ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => i.image_url);
    const imgList = imgs.length > 0 ? imgs : [''];
    setEditImages(imgList.map(url => newEditSlot(url)));
    setEditForm({
      name: (full as Record<string, unknown>).name as string ?? '',
      slug: (full as Record<string, unknown>).slug as string ?? '',
      description: (full as Record<string, unknown>).description as string ?? '',
      short_description: (full as Record<string, unknown>).short_description as string ?? '',
      price: (full as Record<string, unknown>).price?.toString() ?? '',
      sale_price: (full as Record<string, unknown>).sale_price?.toString() ?? '',
      sku: (full as Record<string, unknown>).sku as string ?? '',
      stock_quantity: (full as Record<string, unknown>).stock_quantity?.toString() ?? '',
      category_id: (full as Record<string, unknown>).category_id as string ?? '',
      brand_id: (full as Record<string, unknown>).brand_id as string ?? '',
      status: (full as Record<string, unknown>).status as string ?? 'published',
      is_halal: (full as Record<string, unknown>).is_halal as boolean ?? false,
      is_featured: (full as Record<string, unknown>).is_featured as boolean ?? false,
      is_trending: (full as Record<string, unknown>).is_trending as boolean ?? false,
      country_of_origin: (full as Record<string, unknown>).country_of_origin as string ?? '',
      unit_type: (full as Record<string, unknown>).unit_type as string ?? 'each',
      storage_type: (full as Record<string, unknown>).storage_type as string ?? 'ambient',
      image_url: imgs[0] ?? '',
      quantity_step: ((full as Record<string, unknown>).quantity_step ?? 1).toString(),
      min_order_qty: ((full as Record<string, unknown>).min_order_qty ?? 1).toString(),
      seller_id: (full as Record<string, unknown>).seller_id as string ?? '',
    });
    setEditProduct(p);
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    setEditError('');
    if (!editForm.name.trim()) { setEditError('Product name is required.'); return; }
    if (!editForm.price || isNaN(Number(editForm.price))) { setEditError('A valid price is required.'); return; }
    setEditSaving(true);
    await supabase.from('products').update({
      name: editForm.name.trim(),
      slug: editForm.slug || slugify(editForm.name),
      description: editForm.description || null,
      short_description: editForm.short_description || null,
      price: Number(editForm.price),
      sale_price: editForm.sale_price ? Number(editForm.sale_price) : null,
      sku: editForm.sku || null,
      stock_quantity: editForm.stock_quantity ? Number(editForm.stock_quantity) : 0,
      stock_status: Number(editForm.stock_quantity) > 0 ? 'in_stock' : 'out_of_stock',
      category_id: editForm.category_id || null,
      brand_id: editForm.brand_id || null,
      seller_id: editForm.seller_id || null,
      status: editForm.status,
      is_halal: editForm.is_halal,
      is_featured: editForm.is_featured,
      is_trending: editForm.is_trending,
      country_of_origin: editForm.country_of_origin || null,
      unit_type: editForm.unit_type,
      storage_type: editForm.storage_type,
      quantity_step: parseFloat(editForm.quantity_step as string) || 1,
      min_order_qty: parseFloat(editForm.min_order_qty as string) || 1,
    }).eq('id', editProduct.id);

    // Replace images
    const validImages = editImages.map(s => s.url).filter(u => u.trim());
    await supabase.from('product_images').delete().eq('product_id', editProduct.id);
    if (validImages.length > 0) {
      await supabase.from('product_images').insert(
        validImages.map((url, idx) => ({ product_id: editProduct.id, image_url: url, is_primary: idx === 0, sort_order: idx }))
      );
    }

    setEditSaving(false);
    setEditProduct(null);
    load();
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const inputCls = 'w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white transition-all';
  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  return (
    <AdminBaazarShell title="Products" subtitle={`${products.length} total products`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap flex-1">
          {['all', 'published', 'pending_admin_approval', 'draft', 'rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                statusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}>
              {s === 'pending_admin_approval' ? 'Pending Approval' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Seller</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No products found</td></tr>
              ) : filtered.map(p => {
                const sc = STATUS_CONFIG[p.status] ?? { label: p.status, color: 'text-gray-600 bg-gray-50 border-gray-200' };
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs font-bold flex-shrink-0">{p.name[0]}</div>
                        <div>
                          <p className="font-medium text-xs">{p.name}</p>
                          <p className="text-[10px] text-gray-400">{p.slug}</p>
                          {p.is_halal && <span className="text-[10px] text-green-600 font-medium">Halal</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.seller_profiles?.display_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.categories?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', sc.color)}>{sc.label}</span></td>
                    <td className="px-4 py-3 text-right font-bold text-xs text-emerald-600">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-[11px] px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-100 flex items-center gap-1"
                          title="Edit product"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {p.status === 'pending_admin_approval' && (
                          <>
                            <button onClick={() => updateStatus(p.id, 'published')} className="text-[11px] px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg font-medium hover:bg-green-100 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => updateStatus(p.id, 'rejected')} className="text-[11px] px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                        {p.status === 'published' && (
                          <button
                            onClick={() => updateStatus(p.id, 'draft')}
                            className="text-[11px] px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium hover:bg-amber-100 flex items-center gap-1"
                            title="Unpublish — removes from shop"
                          >
                            <EyeOff className="w-3 h-3" /> Unpublish
                          </button>
                        )}
                        {(p.status === 'draft' || p.status === 'rejected') && (
                          <button
                            onClick={() => updateStatus(p.id, 'published')}
                            className="text-[11px] px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg font-medium hover:bg-green-100 flex items-center gap-1"
                            title="Publish to shop"
                          >
                            <Eye className="w-3 h-3" /> Publish
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="text-[11px] px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1"
                          title="Delete product permanently"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Add New Product</h2>
                <p className="text-xs text-gray-500 mt-0.5">Fill in the details to create a product listing</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">

              {/* Image upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Product Image</label>
                <div className="flex gap-4 items-start">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all flex-shrink-0 overflow-hidden relative"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    ) : imagePreview ? (
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon className="w-7 h-7 text-gray-300 mb-1" />
                        <span className="text-[10px] text-gray-400 text-center px-2">Click to upload</span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={e => { set('image_url', e.target.value); setImagePreview(e.target.value); }}
                      placeholder="Or paste image URL..."
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-gray-600"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload from device
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                    />
                    <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
                      Image must be square — use 500×500 or 1000×1000 px for best results
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Product Title" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Shan Biryani Masala 50g"
                    className={inputCls}
                  />
                </Field>
                <Field label="Slug" required>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => set('slug', e.target.value)}
                    placeholder="auto-generated-from-title"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Short Description">
                <input
                  type="text"
                  value={form.short_description}
                  onChange={e => set('short_description', e.target.value)}
                  placeholder="One-line summary shown in product cards"
                  className={inputCls}
                />
              </Field>

              <Field label="Full Description">
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Detailed product description, ingredients, usage, etc."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white transition-all resize-none"
                />
              </Field>

              {/* Pricing & inventory */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Price (AUD)" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" className={`${inputCls} pl-6`} />
                  </div>
                </Field>
                <Field label="Sale Price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} placeholder="0.00" className={`${inputCls} pl-6`} />
                  </div>
                </Field>
                <Field label="Stock Qty">
                  <input type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} placeholder="0" className={inputCls} />
                </Field>
                <Field label="SKU">
                  <input type="text" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="SKU-001" className={inputCls} />
                </Field>
              </div>

              {/* Seller assignment */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Field label="Assign to Seller (optional)">
                  <div className="relative">
                    <select value={form.seller_id} onChange={e => set('seller_id', e.target.value)} className={selectCls}>
                      <option value="">— No seller (admin-owned product) —</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <p className="text-[11px] text-amber-700 mt-2">Select a seller if you are creating this product on their behalf. It will appear under their store.</p>
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Category" required>
                  <div className="relative">
                    <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={selectCls}>
                      <option value="">Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Brand">
                  <div className="relative">
                    <select value={form.brand_id} onChange={e => set('brand_id', e.target.value)} className={selectCls}>
                      <option value="">Select brand...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
              </div>

              {/* Unit type + quantity settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Unit Type">
                  <div className="relative">
                    <select value={form.unit_type} onChange={e => { set('unit_type', e.target.value); if (['kg','g','litre','ml'].includes(e.target.value)) { set('quantity_step', '0.5'); set('min_order_qty', '0.5'); } else { set('quantity_step', '1'); set('min_order_qty', '1'); } }} className={selectCls}>
                      {[['each','Each (unit)'],['kg','kg — kilogram'],['g','g — gram'],['litre','Litre'],['ml','ml — millilitre'],['pack','Pack'],['dozen','Dozen']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Min. Order Qty">
                  <input type="number" step="0.01" min="0.01" value={form.min_order_qty as string} onChange={e => set('min_order_qty', e.target.value)} placeholder="1" className={inputCls} />
                </Field>
                <Field label="Qty Step">
                  <input type="number" step="0.01" min="0.01" value={form.quantity_step as string} onChange={e => set('quantity_step', e.target.value)} placeholder="1" className={inputCls} />
                </Field>
              </div>

              {/* Storage / Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Storage Type">
                  <div className="relative">
                    <select value={form.storage_type} onChange={e => set('storage_type', e.target.value)} className={selectCls}>
                      {['ambient', 'refrigerated', 'frozen'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Country of Origin">
                  <input type="text" value={form.country_of_origin} onChange={e => set('country_of_origin', e.target.value)} placeholder="e.g. Australia" className={inputCls} />
                </Field>
              </div>

              {/* Status */}
              <Field label="Publish Status">
                <div className="relative">
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
                    <option value="published">Published — visible in store</option>
                    <option value="draft">Draft — hidden from store</option>
                    <option value="pending_admin_approval">Pending Approval</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </Field>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'is_halal', label: 'Halal Certified' },
                  { key: 'is_featured', label: 'Featured' },
                  { key: 'is_trending', label: 'Trending' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => set(key, !form[key as keyof typeof form])}
                      className={cn(
                        'w-9 h-5 rounded-full transition-all relative',
                        form[key as keyof typeof form] ? 'bg-emerald-500' : 'bg-gray-200'
                      )}
                    >
                      <div className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                        form[key as keyof typeof form] ? 'left-4' : 'left-0.5'
                      )} />
                    </div>
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {saveError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit Product</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editProduct.name}</p>
              </div>
              <button onClick={() => setEditProduct(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Images */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Product Images</label>
                <p className="text-xs text-gray-400 mb-3">Click a thumbnail to upload from device, or paste a URL. First image is the primary photo. Up to 5 images.</p>
                <div className="space-y-3">
                  {editImages.map((slot, idx) => (
                    <div key={slot.id} className="flex gap-3 items-start">
                      <div
                        onClick={() => editFileInputs.current.get(slot.id)?.click()}
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all flex-shrink-0 overflow-hidden"
                      >
                        {slot.uploading ? (
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        ) : slot.url ? (
                          <img src={slot.url} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <input
                        ref={el => { if (el) editFileInputs.current.set(slot.id, el); else editFileInputs.current.delete(slot.id); }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleEditImageFile(e.target.files[0], slot.id); }}
                      />
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={slot.url}
                          onChange={e => setEditImages(prev => prev.map(s => s.id === slot.id ? { ...s, url: e.target.value } : s))}
                          placeholder={idx === 0 ? 'Primary image URL or click thumbnail to upload...' : 'Image URL or click thumbnail to upload...'}
                          className={inputCls}
                        />
                        <button type="button" onClick={() => editFileInputs.current.get(slot.id)?.click()}
                          className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                          <Upload className="w-3 h-3" /> Upload from device
                        </button>
                      </div>
                      {editImages.length > 1 && (
                        <button type="button" onClick={() => {
                          editFileInputs.current.delete(slot.id);
                          setEditImages(prev => prev.filter(s => s.id !== slot.id));
                        }}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 mt-0.5">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editImages.length < 5 && (
                    <button type="button" onClick={() => setEditImages(prev => [...prev, newEditSlot()])}
                      className="text-xs text-emerald-600 hover:underline font-medium">+ Add image</button>
                  )}
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Product Title" required>
                  <input type="text" value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                    className={inputCls} />
                </Field>
                <Field label="Slug" required>
                  <input type="text" value={editForm.slug}
                    onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                    className={inputCls} />
                </Field>
              </div>

              <Field label="Short Description">
                <input type="text" value={editForm.short_description}
                  onChange={e => setEditForm(f => ({ ...f, short_description: e.target.value }))}
                  className={inputCls} />
              </Field>

              <Field label="Full Description">
                <textarea value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white transition-all resize-none" />
              </Field>

              {/* Pricing */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Price (AUD)" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={editForm.price}
                      onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                      className={`${inputCls} pl-6`} />
                  </div>
                </Field>
                <Field label="Sale Price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={editForm.sale_price}
                      onChange={e => setEditForm(f => ({ ...f, sale_price: e.target.value }))}
                      className={`${inputCls} pl-6`} />
                  </div>
                </Field>
                <Field label="Stock Qty">
                  <input type="number" min="0" value={editForm.stock_quantity}
                    onChange={e => setEditForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    className={inputCls} />
                </Field>
                <Field label="SKU">
                  <input type="text" value={editForm.sku}
                    onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))}
                    className={inputCls} />
                </Field>
              </div>

              {/* Seller assignment */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Field label="Assign to Seller (optional)">
                  <div className="relative">
                    <select value={editForm.seller_id}
                      onChange={e => setEditForm(f => ({ ...f, seller_id: e.target.value }))}
                      className={selectCls}>
                      <option value="">— No seller (admin-owned product) —</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <p className="text-[11px] text-amber-700 mt-2">Select a seller if this product belongs to or was created on behalf of a seller.</p>
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Category">
                  <div className="relative">
                    <select value={editForm.category_id}
                      onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}
                      className={selectCls}>
                      <option value="">Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Brand">
                  <div className="relative">
                    <select value={editForm.brand_id}
                      onChange={e => setEditForm(f => ({ ...f, brand_id: e.target.value }))}
                      className={selectCls}>
                      <option value="">Select brand...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
              </div>

              {/* Unit type + quantity settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Unit Type">
                  <div className="relative">
                    <select value={editForm.unit_type}
                      onChange={e => setEditForm(f => { const isWeight = ['kg','g','litre','ml'].includes(e.target.value); return { ...f, unit_type: e.target.value, quantity_step: isWeight ? '0.5' : '1', min_order_qty: isWeight ? '0.5' : '1' }; })}
                      className={selectCls}>
                      {[['each','Each (unit)'],['kg','kg — kilogram'],['g','g — gram'],['litre','Litre'],['ml','ml — millilitre'],['pack','Pack'],['dozen','Dozen']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Min. Order Qty">
                  <input type="number" step="0.01" min="0.01" value={editForm.min_order_qty as string}
                    onChange={e => setEditForm(f => ({ ...f, min_order_qty: e.target.value }))}
                    placeholder="1" className={inputCls} />
                </Field>
                <Field label="Qty Step">
                  <input type="number" step="0.01" min="0.01" value={editForm.quantity_step as string}
                    onChange={e => setEditForm(f => ({ ...f, quantity_step: e.target.value }))}
                    placeholder="1" className={inputCls} />
                </Field>
              </div>

              {/* Storage / Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Storage Type">
                  <div className="relative">
                    <select value={editForm.storage_type}
                      onChange={e => setEditForm(f => ({ ...f, storage_type: e.target.value }))}
                      className={selectCls}>
                      {['ambient', 'refrigerated', 'frozen'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Country of Origin">
                  <input type="text" value={editForm.country_of_origin}
                    onChange={e => setEditForm(f => ({ ...f, country_of_origin: e.target.value }))}
                    className={inputCls} />
                </Field>
              </div>

              {/* Status */}
              <Field label="Publish Status">
                <div className="relative">
                  <select value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className={selectCls}>
                    <option value="published">Published — visible in store</option>
                    <option value="draft">Draft — hidden from store</option>
                    <option value="pending_admin_approval">Pending Approval</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </Field>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'is_halal', label: 'Halal Certified' },
                  { key: 'is_featured', label: 'Featured' },
                  { key: 'is_trending', label: 'Trending' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setEditForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                      className={cn('w-9 h-5 rounded-full transition-all relative', editForm[key as keyof typeof editForm] ? 'bg-emerald-500' : 'bg-gray-200')}
                    >
                      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', editForm[key as keyof typeof editForm] ? 'left-4' : 'left-0.5')} />
                    </div>
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{editError}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button onClick={() => setEditProduct(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete Product?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-700">{confirmDelete.name}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              This will permanently remove the product and all its images. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminBaazarShell>
  );
}
