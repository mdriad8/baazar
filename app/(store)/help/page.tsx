'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronRight, ShoppingBag, Truck, RefreshCw, CreditCard, User, Store, Shield, Star, CircleHelp as HelpCircle, MessageSquare, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
  {
    icon: ShoppingBag,
    label: 'Orders & Shopping',
    color: 'bg-blue-50 text-blue-600',
    faqs: [
      {
        q: 'How do I place an order?',
        a: 'Browse our products, add items to your cart, and proceed to checkout. You can checkout as a guest or sign in to your account for a faster experience and to track your orders.',
      },
      {
        q: 'Can I modify or cancel my order after placing it?',
        a: 'You can request a modification or cancellation within 30 minutes of placing your order by contacting our support team. Once the order is picked and packed, we are unable to make changes.',
      },
      {
        q: 'Is there a minimum order value?',
        a: 'There is no minimum order value. However, free delivery applies to orders over $80. Orders below that threshold incur a standard delivery fee based on your location.',
      },
      {
        q: 'How do I use a promo code?',
        a: 'Enter your promo code in the "Promo Code" field at checkout and click Apply. The discount will be reflected in your order total before payment.',
      },
      {
        q: 'Can I place a bulk or wholesale order?',
        a: 'Yes. For large or wholesale orders, please contact our business team at hello@baazar.com.au or call +61 414 480 458. We offer special pricing for high-volume customers.',
      },
    ],
  },
  {
    icon: Truck,
    label: 'Delivery & Tracking',
    color: 'bg-green-50 text-green-600',
    faqs: [
      {
        q: 'Which cities do you deliver to?',
        a: 'We currently deliver to Sydney, Melbourne, Brisbane, and Perth. We are expanding to additional cities — subscribe to our newsletter to be notified when we launch in your area.',
      },
      {
        q: 'How long does delivery take?',
        a: 'Standard delivery takes 2–5 business days. Express delivery (where available) delivers within 1–2 business days. Fresh and chilled products are prioritised for faster dispatch.',
      },
      {
        q: 'How do I track my order?',
        a: 'Once your order is shipped, you will receive a tracking number via email and SMS. You can also track your order from My Account > Orders in your Baazar account.',
      },
      {
        q: 'Do you offer free delivery?',
        a: 'Yes — free standard delivery on all orders over $80. For orders under $80, a flat delivery fee applies depending on your suburb and order weight.',
      },
      {
        q: 'What if nobody is home during delivery?',
        a: 'Our courier will leave a safe drop note or a redelivery card. You can also specify delivery instructions (e.g., "Leave at front door") in the notes field at checkout.',
      },
    ],
  },
  {
    icon: RefreshCw,
    label: 'Returns & Refunds',
    color: 'bg-orange-50 text-orange-600',
    faqs: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 7 days of delivery for non-perishable items that are unopened and in original condition. Perishable and chilled products are not eligible for return unless faulty or incorrect.',
      },
      {
        q: 'How do I request a refund?',
        a: 'Go to My Account > Orders, select the relevant order, and click "Request Refund". Describe the issue and attach a photo if applicable. Our team will review it within 1–2 business days.',
      },
      {
        q: 'My order arrived damaged or incorrect. What do I do?',
        a: 'We sincerely apologise. Please contact us within 48 hours of delivery with a photo of the damaged or incorrect items. We will arrange a replacement or full refund promptly.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Once approved, refunds are processed within 3–5 business days back to your original payment method. Bank processing times may add 1–3 additional days.',
      },
    ],
  },
  {
    icon: CreditCard,
    label: 'Payments',
    color: 'bg-purple-50 text-purple-600',
    faqs: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Visa, Mastercard, PayPal, Afterpay, and Stripe. All transactions are processed securely over SSL. We do not store your full card details.',
      },
      {
        q: 'Is it safe to pay on Baazar?',
        a: 'Yes. Our checkout is secured by SSL encryption and processed through Stripe, a PCI DSS Level 1 certified payment processor — the highest level of payment security.',
      },
      {
        q: 'Can I pay with Afterpay?',
        a: 'Yes, Afterpay is available at checkout for eligible orders. You must have an active Afterpay account and meet their approval criteria. Minimum order value may apply.',
      },
      {
        q: 'Why was my payment declined?',
        a: 'Payments can be declined due to insufficient funds, incorrect card details, or your bank flagging an unusual transaction. Try a different card or contact your bank. You can also reach our support team for help.',
      },
    ],
  },
  {
    icon: User,
    label: 'Account & Profile',
    color: 'bg-teal-50 text-teal-600',
    faqs: [
      {
        q: 'How do I create an account?',
        a: 'Click "Register" in the top right corner of any page, fill in your name, email, and password, and submit. No email confirmation required — you can start shopping immediately.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'Click "Sign In" then "Forgot Password". Enter your email address and we will send you a password reset link. The link expires after 60 minutes.',
      },
      {
        q: 'How do I update my delivery address?',
        a: 'Go to My Account > Addresses to add, edit, or delete saved addresses. You can also add a new address directly at checkout.',
      },
      {
        q: 'How do I delete my account?',
        a: 'To permanently delete your account, please contact us at hello@baazar.com.au with the subject line "Account Deletion Request". Note this action is irreversible and all order history will be lost.',
      },
    ],
  },
  {
    icon: Store,
    label: 'Selling on Baazar',
    color: 'bg-amber-50 text-amber-600',
    faqs: [
      {
        q: 'How do I become a seller on Baazar?',
        a: 'Submit a Seller Application at baazar.com.au/seller-apply. Provide your business name, ABN, product categories, and contact details. Our team reviews applications within 3–5 business days.',
      },
      {
        q: 'What documents do I need to apply as a seller?',
        a: 'You will need a valid ABN, your business registration details, proof of halal certification (if applicable), and product/pricing information. Supporting documents can be uploaded in the application form.',
      },
      {
        q: 'What commission does Baazar charge sellers?',
        a: 'Our commission structure is competitive and varies by category. Details are provided upon approval of your seller application. There are no upfront listing fees.',
      },
      {
        q: 'Can I advertise my products on Baazar?',
        a: 'Yes. Approved sellers can run sponsored product campaigns directly from the Seller Dashboard. Visit our Advertise page for full details on ad formats and pricing.',
      },
    ],
  },
  {
    icon: Shield,
    label: 'Halal Certification',
    color: 'bg-emerald-50 text-emerald-600',
    faqs: [
      {
        q: 'How do I know a product is genuinely halal certified?',
        a: 'Products with the "Halal Certified" badge have been verified by our team. Sellers must provide valid halal certification documentation before the badge is displayed. Certification details are visible on each product page.',
      },
      {
        q: 'Which halal certifying bodies do you accept?',
        a: 'We accept certifications from recognised Australian and international bodies including ANIC, AFIC, MCA, ICV, and equivalent overseas authorities.',
      },
      {
        q: 'What if a product\'s halal status is incorrect or misleading?',
        a: 'Please report it immediately via the product page or email us at hello@baazar.com.au. We take halal compliance very seriously and will investigate within 24 hours.',
      },
    ],
  },
  {
    icon: Star,
    label: 'Reviews & Ratings',
    color: 'bg-yellow-50 text-yellow-600',
    faqs: [
      {
        q: 'Can I leave a review for a product?',
        a: 'Yes. After receiving your order, you can leave a star rating and written review from My Account > Orders. Reviews help other shoppers make informed decisions.',
      },
      {
        q: 'Are reviews moderated?',
        a: 'Yes. All reviews are checked for compliance with our community guidelines before being published. We do not edit the content of legitimate reviews.',
      },
      {
        q: 'Can sellers respond to reviews?',
        a: 'Yes. Sellers can post a public reply to any review on their products. This is visible to all shoppers and encourages transparent communication.',
      },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    faqs: cat.faqs.filter(
      faq =>
        faq.q.toLowerCase().includes(search.toLowerCase()) ||
        faq.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat =>
    search
      ? cat.faqs.length > 0
      : activeCategory === null || cat.label === activeCategory
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container-page text-center">
          <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-700/50 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How can we help?</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
            Find answers to frequently asked questions, or reach out to our team.
          </p>
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              className="pl-12 h-12 text-gray-900 bg-white rounded-xl text-base border-0 shadow-lg"
              placeholder="Search questions e.g. refund, delivery, halal…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="container-page py-12">
        {/* Category pills */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === null
                  ? 'bg-[hsl(var(--primary))] text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              All Topics
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(prev => prev === cat.label ? null : cat.label)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === cat.label
                    ? 'bg-[hsl(var(--primary))] text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No results for &ldquo;{search}&rdquo;</p>
            <p className="text-sm mt-1">Try different keywords or browse all topics above.</p>
          </div>
        )}

        {/* FAQ sections */}
        <div className="space-y-8">
          {filtered.map(cat => (
            <div key={cat.label}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <cat.icon className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{cat.label}</h2>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {cat.faqs.map((faq, i) => {
                  const key = `${cat.label}-${i}`;
                  const open = openItems.has(key);
                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {open && (
                        <div className="px-6 pb-5">
                          <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still need help? */}
        <div className="mt-16 bg-gray-900 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
          <p className="text-gray-400 mb-7 max-w-md mx-auto">
            Our support team is available Monday to Friday 9 am – 6 pm AEST, and Saturday 10 am – 4 pm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/90%] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Send a Message
            </Link>
            <a
              href="tel:+61414480458"
              className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4" />
              +61 414 480 458
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
