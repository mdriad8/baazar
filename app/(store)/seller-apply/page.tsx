'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, CircleCheck as CheckCircle2, ArrowRight, Shield, Package, DollarSign, ChartBar as BarChart3, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const BENEFITS = [
  { icon: Store, title: 'Reach 50,000+ Customers', desc: 'Access Australia\'s growing South Asian community' },
  { icon: DollarSign, title: 'Fast Weekly Payouts', desc: 'Get paid weekly with transparent commission structure' },
  { icon: BarChart3, title: 'Powerful Analytics', desc: 'Track sales, views and customer insights' },
  { icon: Shield, title: 'Halal Verification', desc: 'We verify and showcase your halal certification' },
];

export default function SellerApplyPage() {
  const [form, setForm] = useState({
    business_name: '', business_abn: '', business_type: 'food_supplier',
    contact_name: '', contact_email: '', contact_phone: '',
    business_address: '', suburb: '', state: 'NSW', postcode: '',
    message: '', has_halal_cert: false, has_food_handling_cert: false,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const update = (key: string, value: string | boolean) => setForm(p => ({...p, [key]: value}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Please sign in first', description: 'You need an account to apply as a seller.' });
      router.push('/auth/register');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('seller_applications').insert({
      ...form,
      user_id: user.id,
      status: 'pending',
    });

    setLoading(false);
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-md">
          <CheckCircle2 className="w-16 h-16 text-[hsl(var(--primary))] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Thank you for applying to sell on Baazar. Our team will review your application within 2-3 business days and contact you at {form.contact_email}.
          </p>
          <div className="p-4 bg-[hsl(var(--secondary))] rounded-xl border border-[hsl(var(--primary))]/20 text-left mb-5">
            <p className="text-sm font-semibold text-[hsl(var(--primary))] mb-1">What happens next?</p>
            <ul className="text-sm text-[hsl(var(--primary))]/80 space-y-1">
              <li>1. Admin reviews your application</li>
              <li>2. We verify your business details</li>
              <li>3. Seller profile is created for you</li>
              <li>4. You get access to seller dashboard</li>
            </ul>
          </div>
          <Link href="/">
            <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white">Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gray-900 py-14 px-4">
        <div className="container-page max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 rounded-full mb-5">
            <Store className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span className="text-emerald-300 text-sm font-medium">Become a Seller</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Sell on Baazar &amp; Grow Your Business
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Join Australia&apos;s premier South Asian marketplace. Reach thousands of customers looking for authentic products.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {BENEFITS.map(b => (
              <div key={b.title} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                <b.icon className="w-8 h-8 text-[hsl(var(--primary))] mx-auto mb-2" />
                <p className="text-white text-sm font-semibold">{b.title}</p>
                <p className="text-gray-400 text-xs mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application form */}
      <div className="container-page py-10 max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-bold mb-1">Seller Application</h2>
          <p className="text-muted-foreground text-sm mb-6">Fill in your business details. Our team will review within 2-3 days.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Business Name *</Label>
                <Input className="mt-1.5 h-10" value={form.business_name} onChange={e => update('business_name', e.target.value)} required />
              </div>
              <div>
                <Label>ABN</Label>
                <Input className="mt-1.5 h-10" placeholder="XX XXX XXX XXX" value={form.business_abn} onChange={e => update('business_abn', e.target.value)} />
              </div>
              <div>
                <Label>Contact Name *</Label>
                <Input className="mt-1.5 h-10" value={form.contact_name} onChange={e => update('contact_name', e.target.value)} required />
              </div>
              <div>
                <Label>Contact Email *</Label>
                <Input className="mt-1.5 h-10" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} required />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input className="mt-1.5 h-10" type="tel" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} required />
              </div>
              <div>
                <Label>Business Type</Label>
                <select
                  value={form.business_type}
                  onChange={e => update('business_type', e.target.value)}
                  className="w-full mt-1.5 h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                >
                  {['food_supplier', 'halal_butcher', 'seafood_supplier', 'spice_importer', 'grocery_wholesaler', 'manufacturer', 'other'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Business Address</Label>
              <Input className="mt-1.5 h-10" value={form.business_address} onChange={e => update('business_address', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label>Suburb</Label>
                <Input className="mt-1.5 h-10" value={form.suburb} onChange={e => update('suburb', e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <select value={form.state} onChange={e => update('state', e.target.value)} className="w-full mt-1.5 h-10 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
                  {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Postcode</Label>
                <Input className="mt-1.5 h-10" maxLength={4} value={form.postcode} onChange={e => update('postcode', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.has_halal_cert} onChange={e => update('has_halal_cert', e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                <span className="text-sm text-gray-700">I have a valid Halal certification</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.has_food_handling_cert} onChange={e => update('has_food_handling_cert', e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                <span className="text-sm text-gray-700">I have a valid Food Handling certificate</span>
              </label>
            </div>

            <div>
              <Label>Tell us about your business</Label>
              <Textarea
                className="mt-1.5 text-sm"
                rows={4}
                placeholder="What products do you sell? Where do you source them? Why do you want to sell on Baazar?"
                value={form.message}
                onChange={e => update('message', e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <><Send className="w-4 h-4" /> Submit Application</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
