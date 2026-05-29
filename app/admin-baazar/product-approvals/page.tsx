'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Package, CircleCheck as CheckCircle2, Circle as XCircle, Eye, Shield, Thermometer, ArrowRight, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/lib/auth/context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';

interface PendingEdit {
  name?: string;
  price?: number;
  sale_price?: number | null;
  description?: string;
  short_description?: string;
  category_id?: string;
  stock_quantity?: number;
  sku?: string;
  is_halal?: boolean;
  storage_type?: string;
  origin?: string;
  allergens?: string[];
  storage_instruction?: string;
  image_urls?: string[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  description: string;
  short_description: string;
  is_halal: boolean;
  storage_type: string;
  stock_quantity: number;
  country_of_origin: string;
  status: string;
  created_at: string;
  pending_edit: PendingEdit | null;
  pending_edit_at: string | null;
  seller_profiles: { display_name: string; contact_email: string } | null;
  categories: { name: string } | null;
  brands: { name: string } | null;
  product_images: Array<{ image_url: string; is_primary: boolean }>;
}

type Tab = 'new' | 'edits';

function DiffRow({ label, current, proposed }: { label: string; current: unknown; proposed: unknown }) {
  const changed = String(current ?? '') !== String(proposed ?? '');
  return (
    <div className={cn('grid grid-cols-[120px_1fr_24px_1fr] gap-2 items-start py-1.5 border-b border-gray-100 last:border-0 text-xs', changed && 'bg-amber-50/60 -mx-2 px-2 rounded')}>
      <span className="text-muted-foreground font-medium pt-0.5">{label}</span>
      <span className="text-gray-700 break-words">{String(current ?? '—')}</span>
      {changed ? <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> : <span />}
      <span className={cn('break-words', changed ? 'text-emerald-700 font-semibold' : 'text-gray-400')}>{String(proposed ?? '—')}</span>
    </div>
  );
}

export default function AdminBaazarProductApprovalsPage() {
  const { checking } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('new');
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [editProducts, setEditProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pending }, { data: withEdits }] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, price, sale_price, description, short_description, is_halal, storage_type, stock_quantity, country_of_origin, status, created_at, pending_edit, pending_edit_at, seller_profiles(display_name, contact_email), categories(name), brands(name), product_images(image_url, is_primary)')
        .eq('status', 'pending_admin_approval')
        .order('created_at'),
      supabase
        .from('products')
        .select('id, name, price, sale_price, description, short_description, is_halal, storage_type, stock_quantity, country_of_origin, status, created_at, pending_edit, pending_edit_at, seller_profiles(display_name, contact_email), categories(name), brands(name), product_images(image_url, is_primary)')
        .not('pending_edit', 'is', null)
        .eq('status', 'published')
        .order('pending_edit_at'),
    ]);
    setNewProducts((pending ?? []) as Product[]);
    setEditProducts((withEdits ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => { if (!checking) fetchData(); }, [checking]);

  const handleApproveNew = async (productId: string) => {
    if (!user) return;
    setProcessing(true);
    const { error } = await supabase.from('products').update({
      status: 'published',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      admin_note: note || 'Approved',
      rejection_reason: '',
      pending_edit: null,
      pending_edit_at: null,
    }).eq('id', productId);
    if (error) { toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Product approved', description: 'Product is now live on the marketplace.' }); setSelected(null); setNote(''); await fetchData(); }
    setProcessing(false);
  };

  const handleRejectNew = async (productId: string) => {
    if (!note.trim()) { toast({ title: 'Rejection reason required', variant: 'destructive' }); return; }
    setProcessing(true);
    const { error } = await supabase.from('products').update({ status: 'rejected', rejection_reason: note, admin_note: note }).eq('id', productId);
    if (error) { toast({ title: 'Failed to reject', variant: 'destructive' }); }
    else { toast({ title: 'Product rejected' }); setSelected(null); setNote(''); await fetchData(); }
    setProcessing(false);
  };

  const handleApproveEdit = async (product: Product) => {
    if (!product.pending_edit) return;
    setProcessing(true);
    const edit = product.pending_edit;
    const updatePayload: Record<string, unknown> = {
      pending_edit: null,
      pending_edit_at: null,
      pending_edit_rejection_reason: null,
    };
    if (edit.name !== undefined) updatePayload.name = edit.name;
    if (edit.price !== undefined) updatePayload.price = edit.price;
    if (edit.sale_price !== undefined) updatePayload.sale_price = edit.sale_price;
    if (edit.description !== undefined) updatePayload.description = edit.description;
    if (edit.short_description !== undefined) updatePayload.short_description = edit.short_description;
    if (edit.category_id !== undefined) updatePayload.category_id = edit.category_id;
    if (edit.stock_quantity !== undefined) {
      updatePayload.stock_quantity = edit.stock_quantity;
      updatePayload.stock_status = Number(edit.stock_quantity) > 0 ? 'in_stock' : 'out_of_stock';
    }
    if (edit.sku !== undefined) updatePayload.sku = edit.sku;
    if (edit.is_halal !== undefined) updatePayload.is_halal = edit.is_halal;
    if (edit.storage_type !== undefined) updatePayload.storage_type = edit.storage_type;
    if (edit.origin !== undefined) updatePayload.origin = edit.origin;
    if (edit.allergens !== undefined) updatePayload.allergens = edit.allergens;
    if (edit.storage_instruction !== undefined) updatePayload.storage_instruction = edit.storage_instruction;

    const { error } = await supabase.from('products').update(updatePayload).eq('id', product.id);

    if (!error && edit.image_urls && edit.image_urls.length > 0) {
      await supabase.from('product_images').delete().eq('product_id', product.id);
      await supabase.from('product_images').insert(
        edit.image_urls.map((url, idx) => ({ product_id: product.id, image_url: url, is_primary: idx === 0, sort_order: idx }))
      );
    }

    if (error) { toast({ title: 'Failed to approve edit', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Edit approved', description: 'Product listing updated live.' }); setSelected(null); setNote(''); await fetchData(); }
    setProcessing(false);
  };

  const handleRejectEdit = async (product: Product) => {
    if (!note.trim()) { toast({ title: 'Rejection reason required', variant: 'destructive' }); return; }
    setProcessing(true);
    const { error } = await supabase.from('products').update({
      pending_edit: null,
      pending_edit_at: null,
      pending_edit_rejection_reason: note,
    }).eq('id', product.id);
    if (error) { toast({ title: 'Failed to reject edit', variant: 'destructive' }); }
    else { toast({ title: 'Edit rejected', description: 'Seller has been notified with the reason.' }); setSelected(null); setNote(''); await fetchData(); }
    setProcessing(false);
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activeList = tab === 'new' ? newProducts : editProducts;
  const totalPending = newProducts.length + editProducts.length;

  return (
    <AdminBaazarShell title="Product Approvals" subtitle={`${totalPending} pending review`}>
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([
          { id: 'new', label: 'New Products', count: newProducts.length },
          { id: 'edits', label: 'Seller Edits', count: editProducts.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); setNote(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              tab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}>
            {t.label}
            {t.count > 0 && (
              <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-full', tab === t.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : activeList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === 'new' ? 'No products pending approval' : 'No seller edits pending review'}
              </p>
            </div>
          ) : activeList.map(product => {
            const img = tab === 'edits' && product.pending_edit?.image_urls?.[0]
              ? product.pending_edit.image_urls[0]
              : (product.product_images?.find(i => i.is_primary)?.image_url ?? product.product_images?.[0]?.image_url);
            return (
              <button key={product.id} onClick={() => { setSelected(product); setNote(''); }}
                className={cn('w-full text-left bg-white rounded-xl border p-3 flex gap-3 hover:shadow-md transition-all',
                  selected?.id === product.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-100')}>
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {img
                    ? <Image src={img} alt={product.name} width={56} height={56} className="object-cover w-full h-full" unoptimized />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-300" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {tab === 'edits' && product.pending_edit?.name ? product.pending_edit.name : product.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{product.seller_profiles?.display_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {tab === 'edits' ? (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5" /> Edit pending
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-emerald-600">${product.price.toFixed(2)}</span>
                    )}
                    {product.is_halal && <span className="text-[10px] text-green-600 font-medium">Halal</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">by {selected.seller_profiles?.display_name}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.is_halal && <span className="badge-halal flex items-center gap-1"><Shield className="w-3 h-3" /> Halal</span>}
                {selected.storage_type === 'frozen' && <span className="badge-frozen flex items-center gap-1"><Thermometer className="w-3 h-3" /> Frozen</span>}
              </div>
            </div>

            {/* For edits: show diff */}
            {tab === 'edits' && selected.pending_edit ? (
              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <div className="grid grid-cols-[120px_1fr_24px_1fr] gap-2 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Field</span><span>Current</span><span /><span className="text-amber-600">Proposed</span>
                </div>
                <DiffRow label="Name" current={selected.name} proposed={selected.pending_edit.name} />
                <DiffRow label="Price" current={`$${selected.price?.toFixed(2)}`} proposed={selected.pending_edit.price !== undefined ? `$${Number(selected.pending_edit.price).toFixed(2)}` : undefined} />
                <DiffRow label="Sale Price" current={selected.sale_price ? `$${selected.sale_price.toFixed(2)}` : '—'} proposed={selected.pending_edit.sale_price !== undefined ? (selected.pending_edit.sale_price ? `$${Number(selected.pending_edit.sale_price).toFixed(2)}` : '—') : undefined} />
                <DiffRow label="Storage" current={selected.storage_type} proposed={selected.pending_edit.storage_type} />
                <DiffRow label="Halal" current={selected.is_halal ? 'Yes' : 'No'} proposed={selected.pending_edit.is_halal !== undefined ? (selected.pending_edit.is_halal ? 'Yes' : 'No') : undefined} />
                <DiffRow label="Stock" current={selected.stock_quantity} proposed={selected.pending_edit.stock_quantity} />
                <DiffRow label="Short Desc" current={selected.short_description} proposed={selected.pending_edit.short_description} />
                <DiffRow label="Description" current={(selected.description ?? '').slice(0, 80)} proposed={(selected.pending_edit.description ?? '').slice(0, 80)} />
                {selected.pending_edit.image_urls && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Proposed Images</p>
                    <div className="flex gap-2 flex-wrap">
                      {selected.pending_edit.image_urls.map((url, idx) => (
                        <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-amber-200">
                          <Image src={url} alt="" width={64} height={64} className="object-cover w-full h-full" unoptimized />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground pt-1">
                  Submitted {selected.pending_edit_at ? new Date(selected.pending_edit_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            ) : (
              <>
                {/* New product images */}
                {selected.product_images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selected.product_images.map((img, idx) => (
                      <div key={idx} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border">
                        <Image src={img.image_url} alt="" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                  {[
                    { label: 'Price', value: `$${selected.price.toFixed(2)}` },
                    { label: 'Stock', value: selected.stock_quantity },
                    { label: 'Category', value: selected.categories?.name ?? '—' },
                    { label: 'Brand', value: selected.brands?.name ?? '—' },
                    { label: 'Origin', value: selected.country_of_origin || '—' },
                    { label: 'Storage', value: selected.storage_type },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
                {selected.description && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{selected.description}</p>
                  </div>
                )}
              </>
            )}

            {/* Seller info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <p className="text-xs font-semibold text-blue-700 mb-1">Seller</p>
              <p className="text-blue-800">{selected.seller_profiles?.display_name} · {selected.seller_profiles?.contact_email}</p>
            </div>

            {/* Note */}
            <div>
              <label className="text-sm font-semibold mb-2 block">
                {tab === 'edits' ? 'Rejection Reason (required to reject)' : 'Admin Note / Rejection Reason'}
              </label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (required for rejection)..." rows={3} className="text-sm" />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {tab === 'new' ? (
                <>
                  <Button onClick={() => handleApproveNew(selected.id)} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Approve & Publish
                  </Button>
                  <Button onClick={() => handleRejectNew(selected.id)} disabled={processing} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => handleApproveEdit(selected)} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Approve Edit
                  </Button>
                  <Button onClick={() => handleRejectEdit(selected)} disabled={processing} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-2">
                    <XCircle className="w-4 h-4" /> Reject Edit
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center p-12 text-center">
            <div>
              <Eye className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">Select a product to review</p>
              <p className="text-sm text-muted-foreground mt-1">Click any pending item from the list</p>
            </div>
          </div>
        )}
      </div>
    </AdminBaazarShell>
  );
}
