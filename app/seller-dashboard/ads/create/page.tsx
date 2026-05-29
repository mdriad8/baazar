'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Megaphone, Package, Calendar, DollarSign, Send, CircleAlert as AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Product { id: string; name: string; price: number; status: string; }

const AD_PLACEMENTS = [
  { value: 'hero_banner', label: 'Hero Banner', desc: 'Full-width banner below featured products on homepage — maximum visibility', price: 50 },
  { value: 'mid_page', label: 'Mid-Page Cards', desc: 'Card-style ad in the mid-page sponsored section (up to 3 ads shown side by side)', price: 30 },
  { value: 'search_results', label: 'Search & Category', desc: 'Appear as a promoted listing at the top of search and category pages', price: 25 },
  { value: 'category_page', label: 'Category Page Banner', desc: 'Sponsored banner shown on relevant category listing pages', price: 20 },
  { value: 'sidebar', label: 'Sidebar', desc: 'Side column ad placement visible on desktop throughout the store', price: 15 },
];

export default function CreateAdPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [sellerId, setSellerId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    placement: '',
    start_date: '',
    end_date: '',
    name: '',
    headline: '',
    tagline: '',
    cta_text: 'Shop Now',
    banner_image_url: '',
  });

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: su } = await supabase.from('seller_users').select('seller_id').eq('user_id', user.id).maybeSingle();
      if (!su) { router.push('/seller-apply'); return; }
      setSellerId(su.seller_id);
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, status')
        .eq('seller_id', su.seller_id)
        .eq('status', 'published')
        .order('name');
      setProducts(prods ?? []);
    };
    init();
  }, [user, supabase, router]);

  const selectedPlacement = AD_PLACEMENTS.find(p => p.value === form.placement);
  const numDays = form.start_date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalBudget = selectedPlacement ? selectedPlacement.price * numDays : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || !form.product_id || !form.placement || !form.start_date || !form.end_date) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: newCampaign, error } = await supabase.from('campaigns').insert({
      seller_id: sellerId,
      product_id: form.product_id,
      name: form.name || `Campaign - ${new Date().toLocaleDateString('en-AU')}`,
      ad_type: 'sponsored_product',
      placement: form.placement,
      start_date: form.start_date,
      end_date: form.end_date,
      number_of_days: numDays,
      daily_budget: selectedPlacement?.price ?? 0,
      total_budget: totalBudget,
      amount_paid: 0,
      payment_status: 'pending',
      status: 'draft',
      admin_approval_status: 'pending',
      impressions: 0,
      clicks: 0,
      headline: form.headline || null,
      tagline: form.tagline || null,
      cta_text: form.cta_text || 'Shop Now',
      banner_image_url: form.banner_image_url || null,
    }).select('id').single();

    if (error || !newCampaign) {
      toast({ title: 'Error creating campaign', description: error?.message ?? 'Unknown error', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Redirect to payment page
    router.push(`/seller-dashboard/ads/pay?campaign_id=${newCampaign.id}`);
    setSaving(false);
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading || !user) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-page py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/seller-dashboard" className="text-sm text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium">Create Ad Campaign</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[hsl(var(--secondary))] rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Ad Campaign</h1>
            <p className="text-sm text-muted-foreground">Boost your product visibility on Baazar</p>
          </div>
        </div>

        {products.length === 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No published products found</p>
              <p className="text-xs mt-0.5">You need at least one published product to create an ad campaign. Add a product and get it approved first.</p>
              <Link href="/seller-dashboard/products/new" className="text-xs font-medium underline mt-1 inline-block">Add a product</Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5 flex items-center gap-2"><Package className="w-4 h-4 text-[hsl(var(--primary))]" /> Campaign Details</h2>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input className="mt-1.5 h-10" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramadan Rice Promotion" />
              </div>
              <div>
                <Label>Product to Advertise <span className="text-red-500">*</span></Label>
                <select
                  value={form.product_id}
                  onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                  className="mt-1.5 h-10 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                  required
                >
                  <option value="">Select a published product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</option>)}
                </select>
                {products.length === 0 && <p className="text-xs text-red-500 mt-1">No published products available.</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5 flex items-center gap-2"><Send className="w-4 h-4 text-[hsl(var(--primary))]" /> Ad Creative <span className="text-gray-400 text-sm font-normal">(optional)</span></h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Headline</Label>
                  <Input className="mt-1.5 h-10" placeholder="e.g. Freshest Halal Deals" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} maxLength={60} />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input className="mt-1.5 h-10" placeholder="e.g. Up to 30% off this week" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} maxLength={80} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CTA Button Text</Label>
                  <Input className="mt-1.5 h-10" placeholder="Shop Now" value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} maxLength={20} />
                </div>
                <div>
                  <Label>Banner Image URL <span className="text-gray-400 font-normal text-xs">(1200×400 landscape)</span></Label>
                  <Input className="mt-1.5 h-10 text-xs" placeholder="https://..." value={form.banner_image_url} onChange={e => setForm(f => ({ ...f, banner_image_url: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-gray-500">If you don&apos;t fill these in, your product&apos;s image and name will be used automatically. Admin may also update these during review.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><Megaphone className="w-4 h-4 text-[hsl(var(--primary))]" /> Ad Placement <span className="text-red-500">*</span></h2>
            <div className="space-y-2">
              {AD_PLACEMENTS.map(placement => (
                <label
                  key={placement.value}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                    form.placement === placement.value
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <input
                    type="radio"
                    name="placement"
                    value={placement.value}
                    checked={form.placement === placement.value}
                    onChange={() => setForm(f => ({ ...f, placement: placement.value }))}
                    className="mt-1 accent-[hsl(var(--primary))]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{placement.label}</p>
                      <span className="font-bold text-[hsl(var(--primary))] text-sm">${placement.price}/day</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{placement.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5 flex items-center gap-2"><Calendar className="w-4 h-4 text-[hsl(var(--primary))]" /> Campaign Duration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-10" type="date" min={today} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div>
                <Label>End Date <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-10" type="date" min={form.start_date || today} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
              </div>
            </div>
            {numDays > 0 && (
              <p className="text-sm text-gray-600 mt-3">Duration: <strong>{numDays} {numDays === 1 ? 'day' : 'days'}</strong></p>
            )}
          </div>

          {selectedPlacement && numDays > 0 && (
            <div className="bg-white rounded-2xl border border-[hsl(var(--primary))]/20 shadow-sm p-6">
              <h2 className="font-bold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-[hsl(var(--primary))]" /> Campaign Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Placement</span>
                  <span className="font-medium">{selectedPlacement.label}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Daily rate</span>
                  <span className="font-medium">${selectedPlacement.price}/day</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Duration</span>
                  <span className="font-medium">{numDays} days</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-[hsl(var(--primary))]">${totalBudget.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">You will be taken to a secure Stripe checkout to complete payment. Your campaign enters admin review once payment is confirmed.</p>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <p className="font-semibold mb-1">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
              <li>Fill in your campaign details and click &quot;Continue to Payment&quot;</li>
              <li>Complete payment via Stripe (secure checkout)</li>
              <li>Your campaign is automatically submitted for admin review</li>
              <li>Admin approves within 24 hours — your ad goes live on the start date</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Link href="/seller-dashboard">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={saving || !form.product_id || !form.placement || !form.start_date || !form.end_date}
              className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {saving ? 'Saving...' : `Continue to Payment${totalBudget > 0 ? ` — $${totalBudget.toFixed(2)}` : ''}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
