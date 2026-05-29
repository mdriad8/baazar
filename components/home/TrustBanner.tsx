import { ShieldCheck, Truck, RefreshCcw, Leaf } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Halal Certified',
    desc: 'All meat products verified halal',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'Same & next day delivery options',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: RefreshCcw,
    title: 'Easy Returns',
    desc: 'Hassle-free 7-day return policy',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Leaf,
    title: 'Fresh Quality',
    desc: 'Farm-fresh and authentic produce',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
];

export default function TrustBanner() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {FEATURES.map(f => (
        <div key={f.title} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
            <f.icon className={`w-5 h-5 ${f.color}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{f.title}</p>
            <p className="text-xs text-muted-foreground leading-tight">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
