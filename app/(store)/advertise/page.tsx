import Link from 'next/link';
import { TrendingUp, Target, ChartBar as BarChart2, Zap, ShoppingBag, Star, CircleCheck as CheckCircle, ArrowRight, Users, Eye, MousePointerClick, Megaphone, LayoutDashboard, BadgeCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AD_FORMATS = [
  {
    icon: Zap,
    title: 'Sponsored Products',
    desc: 'Appear at the top of search results and category pages when shoppers are actively looking to buy. Pay only when someone clicks your ad.',
    badge: 'Most Popular',
    badgeColor: 'bg-green-100 text-green-700',
    features: ['Top search placement', 'Pay-per-click pricing', 'Real-time analytics', 'No minimum spend'],
  },
  {
    icon: Eye,
    title: 'Banner Ads',
    desc: 'High-visibility display banners on the homepage, category pages, and throughout the shopping experience. Build brand awareness at scale.',
    badge: 'Brand Building',
    badgeColor: 'bg-blue-100 text-blue-700',
    features: ['Homepage hero placement', 'Category page banners', 'Mobile-optimised creative', 'Weekly impression reports'],
  },
  {
    icon: Target,
    title: 'Featured Listings',
    desc: 'Pin your products to the top of category and search results pages for guaranteed visibility throughout your campaign period.',
    badge: 'Guaranteed Reach',
    badgeColor: 'bg-amber-100 text-amber-700',
    features: ['Fixed top placement', 'Category-level targeting', 'Flat weekly/monthly rate', 'No bidding required'],
  },
  {
    icon: Megaphone,
    title: 'Deal & Promo Highlights',
    desc: 'Showcase your promotions, clearance sales, and bundle deals in the Deals & Offers section — the most visited page for bargain hunters.',
    badge: 'Drive Volume',
    badgeColor: 'bg-orange-100 text-orange-700',
    features: ['Deals page placement', 'Promo badge on product card', 'Push notification support', 'Seasonal campaign slots'],
  },
];

const STATS = [
  { icon: Users, value: '50,000+', label: 'Monthly active shoppers' },
  { icon: ShoppingBag, value: '12,000+', label: 'Orders processed per month' },
  { icon: Eye, value: '800K+', label: 'Product page views monthly' },
  { icon: MousePointerClick, value: '4.8%', label: 'Average ad click-through rate' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Apply as a Seller',
    desc: 'Submit your seller application and get approved. All advertising is available exclusively to verified Baazar sellers.',
  },
  {
    step: '02',
    title: 'Choose Your Ad Format',
    desc: 'Pick from Sponsored Products, Banner Ads, Featured Listings, or Deal Highlights — whichever matches your goal.',
  },
  {
    step: '03',
    title: 'Set Budget & Targeting',
    desc: 'Define your daily or total budget, target relevant product categories, and schedule your campaign dates.',
  },
  {
    step: '04',
    title: 'Launch & Measure',
    desc: 'Go live and track impressions, clicks, and conversions in real time from your Seller Dashboard.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$49',
    period: '/week',
    desc: 'Perfect for new sellers testing the platform.',
    features: [
      '1 Sponsored Product slot',
      'Basic analytics dashboard',
      'Email support',
      'No lock-in contract',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$149',
    period: '/week',
    desc: 'For sellers ready to scale their visibility.',
    features: [
      'Up to 5 Sponsored Products',
      '1 Category Banner Ad',
      'Advanced analytics & reports',
      'Priority email support',
      'Campaign performance review',
    ],
    cta: 'Start Growing',
    highlight: true,
  },
  {
    name: 'Pro',
    price: 'Custom',
    period: '',
    desc: 'Enterprise campaigns with dedicated support.',
    features: [
      'Unlimited Sponsored Products',
      'Homepage hero banner',
      'Deals page inclusion',
      'Dedicated account manager',
      'Monthly strategy call',
      'Custom reporting',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,197,94,0.12),_transparent_60%)]" />
        <div className="container-page relative text-center">
          <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-700/50 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <TrendingUp className="w-4 h-4" />
            Advertising on Baazar
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
            Grow Your Business<br />
            <span className="text-[hsl(var(--primary))]">Where Customers Shop</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-9">
            Put your products in front of thousands of engaged South Asian grocery shoppers across Australia. Targeted, affordable, and results-driven.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/seller-apply"
              className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors"
            >
              Start Advertising
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-white">
        <div className="container-page py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why advertise */}
      <section className="container-page py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Why advertise on Baazar?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Baazar is Australia&apos;s dedicated South Asian marketplace — a highly targeted audience that shops for the exact products you sell.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'Hyper-targeted audience', desc: 'Reach shoppers who are already searching for halal meat, spices, rice, and South Asian groceries — not generic browsing traffic.' },
            { icon: BarChart2, title: 'Transparent analytics', desc: 'Track impressions, clicks, conversions, and ROAS from your Seller Dashboard. No guesswork — just data you can act on.' },
            { icon: BadgeCheck, title: 'Trusted marketplace', desc: 'Baazar is a verified halal marketplace. Advertising here associates your brand with trust, quality, and community.' },
            { icon: Zap, title: 'Quick to launch', desc: 'Set up a campaign in minutes from your Seller Dashboard. No agency, no lengthy onboarding — you are live within hours.' },
            { icon: ShoppingBag, title: 'High purchase intent', desc: 'Our shoppers visit Baazar with a clear intention to buy. Ads placed at the right moment convert at significantly higher rates.' },
            { icon: Star, title: 'Grow reviews & ratings', desc: 'More visibility means more orders, which means more verified reviews — boosting your organic ranking over time.' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ad formats */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Ad formats</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Choose the format that best fits your goal — awareness, consideration, or direct sales.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {AD_FORMATS.map(fmt => (
              <div key={fmt.title} className="bg-gray-50 rounded-2xl border border-gray-100 p-7 hover:border-[hsl(var(--primary))]/40 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                    <fmt.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${fmt.badgeColor}`}>{fmt.badge}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{fmt.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{fmt.desc}</p>
                <ul className="space-y-2">
                  {fmt.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">From application to live campaign in four simple steps.</p>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-8 left-[calc(12.5%+1.25rem)] right-[calc(12.5%+1.25rem)] h-px bg-gray-200" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(step => (
              <div key={step.step} className="text-center relative">
                <div className="w-16 h-16 bg-white border-2 border-[hsl(var(--primary))]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="text-xl font-bold text-[hsl(var(--primary))]">{step.step}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500 max-w-xl mx-auto">No lock-in contracts. No hidden fees. Start small and scale as you grow.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 flex flex-col ${plan.highlight ? 'bg-gray-900 text-white ring-2 ring-[hsl(var(--primary))]' : 'bg-gray-50 border border-gray-100 text-gray-900'}`}
              >
                {plan.highlight && (
                  <div className="text-xs font-bold text-[hsl(var(--primary))] mb-2 tracking-wide uppercase">Most Popular</div>
                )}
                <div className="mb-4">
                  <h3 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className={`text-3xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    {plan.period && <span className={`text-sm pb-1 ${plan.highlight ? 'text-gray-400' : 'text-gray-400'}`}>{plan.period}</span>}
                  </div>
                  <p className={`text-sm mt-1 ${plan.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--primary))]'}`} />
                      <span className={plan.highlight ? 'text-gray-300' : 'text-gray-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === 'Pro' ? '/contact' : '/seller-apply'}
                  className={`inline-flex items-center justify-center gap-1.5 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90'
                      : 'bg-gray-900 text-white hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            All prices are in AUD and exclude GST. Custom packages available — <Link href="/contact" className="text-[hsl(var(--primary))] hover:underline">contact our sales team</Link>.
          </p>
        </div>
      </section>

      {/* Seller dashboard callout */}
      <section className="container-page py-16">
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="w-5 h-5 text-[hsl(var(--primary))]" />
                <span className="text-sm font-medium text-[hsl(var(--primary))]">Seller Dashboard</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Manage campaigns from your dashboard
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Create, pause, and optimise your ad campaigns anytime. View real-time impressions, clicks, spend, and revenue directly in your Baazar Seller Dashboard — no third-party tools required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/seller-apply"
                  className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  Apply as a Seller
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-3 text-sm min-w-[220px]">
              {[
                'Sponsored Products',
                'Banner Ad Campaigns',
                'Featured Listings',
                'Deal Promotions',
                'Real-time Analytics',
                'Budget Controls',
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-gray-300">
                  <CheckCircle className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
