'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CircleCheck as CheckCircle, MessageSquare, Building2, CircleAlert as AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TOPICS = [
  'Order issue',
  'Delivery enquiry',
  'Product enquiry',
  'Returns & refunds',
  'Seller enquiry',
  'Account help',
  'Advertising',
  'Partnership',
  'Other',
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-contact-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container-page text-center">
          <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-700/50 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <MessageSquare className="w-4 h-4" />
            We&apos;re here to help
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Have a question, concern, or want to work with us? Our team typically responds within one business day.
          </p>
        </div>
      </section>

      <div className="container-page py-16">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Left — info cards */}
          <div className="space-y-5">
            {/* Main Branch */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Main Branch</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Level 9, Suite 1 &amp; 2<br />
                2 Queen Street<br />
                Melbourne VIC 3000<br />
                Australia
              </p>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Phone className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
              <a
                href="tel:+61414480458"
                className="text-sm text-[hsl(var(--primary))] font-medium hover:underline"
              >
                +61 414 480 458
              </a>
              <p className="text-xs text-gray-400 mt-1">Mon–Fri, 9 am – 6 pm AEST</p>
            </div>

            {/* Email */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
              <a
                href="mailto:hello@baazar.com.au"
                className="text-sm text-[hsl(var(--primary))] font-medium hover:underline"
              >
                hello@baazar.com.au
              </a>
              <p className="text-xs text-gray-400 mt-1">We reply within 1 business day</p>
            </div>

            {/* Hours */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">Business Hours</h3>
              <div className="space-y-1.5 text-sm">
                {[
                  { day: 'Monday – Friday', hours: '9:00 am – 6:00 pm' },
                  { day: 'Saturday', hours: '10:00 am – 4:00 pm' },
                  { day: 'Sunday', hours: 'Closed' },
                ].map(r => (
                  <div key={r.day} className="flex justify-between">
                    <span className="text-gray-500">{r.day}</span>
                    <span className={r.hours === 'Closed' ? 'text-red-400 font-medium' : 'text-gray-900 font-medium'}>
                      {r.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-100 h-44 flex flex-col items-center justify-center gap-2 text-gray-400">
                <MapPin className="w-8 h-8" />
                <span className="text-sm font-medium">2 Queen Street, Melbourne</span>
              </div>
              <div className="p-4">
                <a
                  href="https://maps.google.com/?q=2+Queen+Street+Melbourne+VIC+3000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[hsl(var(--primary))] font-medium hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* Right — contact form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-[hsl(var(--primary))]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Message sent!</h2>
                  <p className="text-gray-500 max-w-sm">
                    Thanks for reaching out. Our team will get back to you within one business day.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', topic: '', message: '' }); }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Send us a message</h2>
                  <p className="text-sm text-gray-500 mb-7">Fill in the form and we&apos;ll get back to you as soon as possible.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+61 4XX XXX XXX"
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Topic <span className="text-red-500">*</span></Label>
                        <Select required onValueChange={v => setForm(f => ({ ...f, topic: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOPICS.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="message"
                        placeholder="Describe your enquiry in as much detail as possible..."
                        rows={6}
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        required
                      />
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 text-base font-semibold gap-2"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-gray-400">
                      By submitting this form you agree to our{' '}
                      <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
