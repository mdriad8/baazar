'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Package, CircleCheck as CheckCircle2, Send, X, Clock, CircleAlert as AlertCircle, ImagePlus, Upload, Loader as Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Category { id: string; name: string; }

interface ImageSlot { id: string; url: string; uploading: boolean; }

let slotCounter = 0;
function newSlot(url = ''): ImageSlot {
  return { id: `slot-${++slotCounter}`, url, uploading: false };
}

export default function EditProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const supabase = createClient();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [productStatus, setProductStatus] = useState('');
  const [hasPendingEdit, setHasPendingEdit] = useState(false);
  const [pendingEditAt, setPendingEditAt] = useState<string | null>(null);
  const [pendingEditRejectionReason, setPendingEditRejectionReason] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [images, setImages] = useState<ImageSlot[]>([newSlot()]);
  const fileInputs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [form, setForm] = useState({
    name: '',
    description: '',
    short_description: '',
    price: '',
    sale_price: '',
    category_id: '',
    stock_quantity: '',
    sku: '',
    is_halal: false,
    storage_type: 'ambient',
    origin: '',
    allergens: '',
    storage_instruction: '',
    unit_type: 'each',
    quantity_step: '1',
    min_order_qty: '1',
  });

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !productId) return;
    const load = async () => {
      const [{ data: cats }, { data: product }, { data: imgData }] = await Promise.all([
        supabase.from('categories').select('id, name').is('parent_id', null).order('name'),
        supabase.from('products').select('*, pending_edit, pending_edit_at, pending_edit_rejection_reason, rejection_reason').eq('id', productId).maybeSingle(),
        supabase.from('product_images').select('image_url, is_primary').eq('product_id', productId).order('sort_order'),
      ]);
      setCategories(cats ?? []);
      if (product) {
        setProductStatus(product.status);
        setHasPendingEdit(!!product.pending_edit);
        setPendingEditAt(product.pending_edit_at ?? null);
        setPendingEditRejectionReason(product.pending_edit_rejection_reason ?? null);
        setRejectionReason(product.rejection_reason ?? null);

        const src = product.pending_edit ?? product;
        setForm({
          name: src.name ?? product.name ?? '',
          description: src.description ?? product.description ?? '',
          short_description: src.short_description ?? product.short_description ?? '',
          price: src.price?.toString() ?? product.price?.toString() ?? '',
          sale_price: src.sale_price?.toString() ?? product.sale_price?.toString() ?? '',
          category_id: src.category_id ?? product.category_id ?? '',
          stock_quantity: src.stock_quantity?.toString() ?? product.stock_quantity?.toString() ?? '',
          sku: src.sku ?? product.sku ?? '',
          is_halal: src.is_halal ?? product.is_halal ?? false,
          storage_type: src.storage_type ?? product.storage_type ?? 'ambient',
          origin: src.origin ?? product.origin ?? '',
          allergens: Array.isArray(src.allergens) ? src.allergens.join(', ') : (Array.isArray(product.allergens) ? product.allergens.join(', ') : ''),
          storage_instruction: src.storage_instruction ?? product.storage_instruction ?? '',
          unit_type: src.unit_type ?? product.unit_type ?? 'each',
          quantity_step: (src.quantity_step ?? product.quantity_step ?? 1).toString(),
          min_order_qty: (src.min_order_qty ?? product.min_order_qty ?? 1).toString(),
        });
      }
      if (imgData && imgData.length > 0) {
        setImages(imgData.map((i: { image_url: string }) => newSlot(i.image_url)));
      }
      setFetching(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId]);

  const handleImageFile = async (file: File, slotId: string) => {
    setImages(prev => prev.map(s => s.id === slotId ? { ...s, uploading: true } : s));
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setImages(prev => prev.map(s => s.id === slotId ? { ...s, url: urlData.publicUrl, uploading: false } : s));
    } else {
      toast({ title: 'Image upload failed', description: error.message, variant: 'destructive' });
      setImages(prev => prev.map(s => s.id === slotId ? { ...s, uploading: false } : s));
    }
    const input = fileInputs.current.get(slotId);
    if (input) input.value = '';
  };

  const buildPayload = () => ({
    name: form.name,
    description: form.description,
    short_description: form.short_description,
    price: parseFloat(form.price),
    sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
    category_id: form.category_id || null,
    stock_quantity: parseInt(form.stock_quantity) || 0,
    stock_status: parseInt(form.stock_quantity) > 0 ? 'in_stock' : 'out_of_stock',
    sku: form.sku || null,
    is_halal: form.is_halal,
    storage_type: form.storage_type,
    origin: form.origin || null,
    allergens: form.allergens ? form.allergens.split(',').map((a: string) => a.trim()) : null,
    storage_instruction: form.storage_instruction || null,
    unit_type: form.unit_type,
    quantity_step: parseFloat(form.quantity_step) || 1,
    min_order_qty: parseFloat(form.min_order_qty) || 1,
  });

  const handleSave = async (mode: 'draft' | 'submit') => {
    setSaving(true);
    const validImages = images.map(s => s.url).filter(u => u.trim());

    if (productStatus === 'published') {
      const pendingPayload = { ...buildPayload(), image_urls: validImages };
      const { error: pendingError } = await supabase.from('products').update({
        pending_edit: pendingPayload,
        pending_edit_at: new Date().toISOString(),
        pending_edit_rejection_reason: null,
      }).eq('id', productId);

      if (pendingError) {
        toast({ title: 'Failed to submit edit', description: pendingError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      setHasPendingEdit(true);
      setPendingEditAt(new Date().toISOString());
      setPendingEditRejectionReason(null);
      toast({ title: 'Edit submitted for admin review', description: 'Your changes are pending approval. The live listing stays unchanged until approved.' });
      setSaving(false);
      router.push('/seller-dashboard/products');
      return;
    }

    const status = mode === 'submit' ? 'pending_admin_approval' : 'draft';
    const { error: updateError } = await supabase.from('products').update({
      ...buildPayload(),
      status,
      pending_edit: null,
      pending_edit_at: null,
      pending_edit_rejection_reason: null,
      rejection_reason: null,
    }).eq('id', productId);

    if (updateError) {
      toast({ title: 'Failed to save product', description: updateError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await supabase.from('product_images').delete().eq('product_id', productId);
    if (validImages.length > 0) {
      await supabase.from('product_images').insert(
        validImages.map((url, idx) => ({ product_id: productId, image_url: url, is_primary: idx === 0, sort_order: idx }))
      );
    }

    toast({ title: mode === 'submit' ? 'Product submitted for approval' : 'Product saved' });
    setSaving(false);
    router.push('/seller-dashboard/products');
  };

  const withdrawPendingEdit = async () => {
    await supabase.from('products').update({
      pending_edit: null,
      pending_edit_at: null,
      pending_edit_rejection_reason: null,
    }).eq('id', productId);
    setHasPendingEdit(false);
    setPendingEditAt(null);
    setPendingEditRejectionReason(null);
    toast({ title: 'Pending edit withdrawn' });
    router.push('/seller-dashboard/products');
  };

  if (loading || !user || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPublished = productStatus === 'published';
  const canEdit = ['draft', 'rejected', 'published'].includes(productStatus);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-page py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/seller-dashboard/products" className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> My Products
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium">Edit Product</span>
        </div>

        {isPublished && !hasPendingEdit && (
          <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">This product is live in the store</p>
              <p className="mt-0.5 text-blue-600">Any changes you submit will go to admin for approval before going live. The current listing stays unchanged until approved.</p>
            </div>
          </div>
        )}

        {hasPendingEdit && !pendingEditRejectionReason && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-start gap-2.5">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Edit pending admin approval</p>
              <p className="mt-0.5 text-amber-600">
                Submitted {pendingEditAt ? new Date(pendingEditAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}. The live listing is unchanged until approved.
              </p>
            </div>
            <button onClick={withdrawPendingEdit} className="text-xs font-medium text-amber-700 hover:text-amber-900 underline flex-shrink-0">
              Withdraw
            </button>
          </div>
        )}

        {pendingEditRejectionReason && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2.5">
            <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Your edit was rejected</p>
              <p className="mt-0.5 text-red-600">Reason: {pendingEditRejectionReason}</p>
              <p className="mt-1 text-red-500 text-xs">Please address the issue below and resubmit.</p>
            </div>
          </div>
        )}

        {productStatus === 'rejected' && rejectionReason && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2.5">
            <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">This product was rejected by admin</p>
              <p className="mt-0.5 text-red-600">Reason: {rejectionReason}</p>
              <p className="mt-1 text-red-500 text-xs">Please address the issue below and resubmit for approval.</p>
            </div>
          </div>
        )}

        {!canEdit && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            This product is currently <strong>{productStatus.replace(/_/g, ' ')}</strong> and cannot be edited.
          </div>
        )}

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5 flex items-center gap-2"><Package className="w-4 h-4 text-[hsl(var(--primary))]" /> Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label>Product Name <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-10" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={!canEdit} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (AUD) <span className="text-red-500">*</span></Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input className="pl-7 h-10" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} disabled={!canEdit} />
                  </div>
                </div>
                <div>
                  <Label>Sale Price <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input className="pl-7 h-10" type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} disabled={!canEdit} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    disabled={!canEdit}
                    className="mt-1.5 h-10 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Stock Quantity</Label>
                  <Input className="mt-1.5 h-10" type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} disabled={!canEdit} />
                </div>
              </div>
              <div>
                <Label>SKU</Label>
                <Input className="mt-1.5 h-10" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} disabled={!canEdit} />
              </div>
              <div>
                <Label>Short Description</Label>
                <Input className="mt-1.5 h-10" value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} disabled={!canEdit} />
              </div>
              <div>
                <Label>Full Description</Label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  disabled={!canEdit}
                  className="mt-1.5 w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><ImagePlus className="w-4 h-4 text-[hsl(var(--primary))]" /> Product Images</h2>
            {canEdit && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                <ImagePlus className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Images must be square</p>
                  <p className="text-xs text-amber-600 mt-0.5">Use a 1:1 ratio (e.g. 500×500, 1000×1000 px). The first image is the primary product photo.</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-3">Upload from your device or paste a URL. Up to 5 images.</p>
            <div className="space-y-3">
              {images.map((slot, idx) => (
                <div key={slot.id} className="flex gap-3 items-start">
                  <div
                    onClick={() => canEdit && fileInputs.current.get(slot.id)?.click()}
                    className={`w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden relative transition-all ${canEdit ? 'cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]/40' : 'cursor-default'}`}
                  >
                    {slot.uploading ? (
                      <Loader2 className="w-5 h-5 text-[hsl(var(--primary))] animate-spin" />
                    ) : slot.url ? (
                      <img src={slot.url} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <input
                    ref={el => { if (el) fileInputs.current.set(slot.id, el); else fileInputs.current.delete(slot.id); }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0], slot.id); }}
                  />
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={slot.url}
                      onChange={e => setImages(prev => prev.map(s => s.id === slot.id ? { ...s, url: e.target.value } : s))}
                      placeholder={idx === 0 ? 'Primary image URL or click thumbnail to upload...' : 'Image URL or click thumbnail to upload...'}
                      className="h-9 text-sm"
                      disabled={!canEdit}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => fileInputs.current.get(slot.id)?.click()}
                        className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" /> Upload from device
                      </button>
                    )}
                  </div>
                  {images.length > 1 && canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        fileInputs.current.delete(slot.id);
                        setImages(prev => prev.filter(s => s.id !== slot.id));
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 mt-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {images.length < 5 && canEdit && (
                <button
                  type="button"
                  onClick={() => setImages(prev => [...prev, newSlot()])}
                  className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
                >
                  + Add another image
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-1 flex items-center gap-2"><Package className="w-4 h-4 text-[hsl(var(--primary))]" /> Quantity &amp; Unit Settings</h2>
            <p className="text-xs text-muted-foreground mb-4">Set how this product is measured and sold. For bulk/raw items (e.g. rice, meat) use kg or g and set appropriate increments.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unit Type</Label>
                  <select
                    value={form.unit_type}
                    onChange={e => setForm(f => ({ ...f, unit_type: e.target.value, quantity_step: ['kg','g','litre','ml'].includes(e.target.value) ? '0.5' : '1', min_order_qty: ['kg','g','litre','ml'].includes(e.target.value) ? '0.5' : '1' }))}
                    disabled={!canEdit}
                    className="mt-1.5 h-10 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="each">Each (unit)</option>
                    <option value="kg">kg — kilogram</option>
                    <option value="g">g — gram</option>
                    <option value="litre">Litre</option>
                    <option value="ml">ml — millilitre</option>
                    <option value="pack">Pack</option>
                    <option value="dozen">Dozen</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Price is per {form.unit_type === 'each' ? 'unit' : form.unit_type}</p>
                </div>
                <div>
                  <Label>Min. Order Quantity</Label>
                  <Input
                    className="mt-1.5 h-10"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.min_order_qty}
                    onChange={e => setForm(f => ({ ...f, min_order_qty: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="e.g. 0.5"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Minimum a customer must buy</p>
                </div>
                <div>
                  <Label>Qty Step / Increment</Label>
                  <Input
                    className="mt-1.5 h-10"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.quantity_step}
                    onChange={e => setForm(f => ({ ...f, quantity_step: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="e.g. 0.5"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Each +/- increases by this</p>
                </div>
              </div>
              {['kg','g','litre','ml'].includes(form.unit_type) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  <strong>Tip:</strong> For {form.unit_type} products, customers will see a quantity selector in {form.unit_type} increments. Set the step to match how you sell — e.g. 0.5 for half-kilo lots, 0.25 for quarter-kilo.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5">Product Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Storage Type</Label>
                  <select
                    value={form.storage_type}
                    onChange={e => setForm(f => ({ ...f, storage_type: e.target.value }))}
                    disabled={!canEdit}
                    className="mt-1.5 h-10 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="ambient">Ambient</option>
                    <option value="chilled">Chilled</option>
                    <option value="frozen">Frozen</option>
                  </select>
                </div>
                <div>
                  <Label>Origin</Label>
                  <Input className="mt-1.5 h-10" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} disabled={!canEdit} />
                </div>
              </div>
              <div>
                <Label>Allergens <span className="text-gray-400 font-normal">(comma separated)</span></Label>
                <Input className="mt-1.5 h-10" value={form.allergens} onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))} disabled={!canEdit} />
              </div>
              <div>
                <Label>Storage Instructions</Label>
                <Input className="mt-1.5 h-10" value={form.storage_instruction} onChange={e => setForm(f => ({ ...f, storage_instruction: e.target.value }))} disabled={!canEdit} />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_halal}
                  onChange={e => setForm(f => ({ ...f, is_halal: e.target.checked }))}
                  disabled={!canEdit}
                  className="w-4 h-4 accent-[hsl(var(--primary))]"
                />
                <span className="text-sm font-medium text-gray-700">Halal certified</span>
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-3 flex-wrap">
              {isPublished ? (
                <Button
                  onClick={() => handleSave('submit')}
                  disabled={saving}
                  className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2"
                >
                  <Send className="w-4 h-4" />
                  {saving ? 'Submitting...' : hasPendingEdit ? 'Resubmit for Approval' : 'Submit Changes for Approval'}
                </Button>
              ) : (
                <>
                  <Button onClick={() => handleSave('draft')} disabled={saving} variant="outline" className="gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Save as Draft
                  </Button>
                  <Button onClick={() => handleSave('submit')} disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
                    <Send className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
