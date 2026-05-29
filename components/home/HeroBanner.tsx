'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  link_text: string;
}

const DEFAULT_BANNERS: Banner[] = [
  {
    id: '1',
    title: 'Fresh Halal Meat Delivered',
    subtitle: 'Premium quality halal certified meat from trusted Australian suppliers. Delivered fresh to your door.',
    image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    link_url: '/category/halal-meat',
    link_text: 'Shop Halal Meat',
  },
  {
    id: '2',
    title: 'Authentic South Asian Groceries',
    subtitle: 'Everything from back home — spices, rice, lentils, and more. Delivered across Australia.',
    image_url: 'https://images.pexels.com/photos/1435735/pexels-photo-1435735.jpeg',
    link_url: '/products',
    link_text: 'Explore All Products',
  },
  {
    id: '3',
    title: 'Fresh Seafood & More',
    subtitle: 'Sustainably sourced fresh and frozen seafood. Ocean-fresh quality delivered weekly.',
    image_url: 'https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg',
    link_url: '/category/seafood',
    link_text: 'Shop Seafood',
  },
];

export default function HeroBanner({ banners = DEFAULT_BANNERS }: { banners?: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const items = banners.length > 0 ? banners : DEFAULT_BANNERS;

  useEffect(() => {
    const interval = setInterval(() => {
      goNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [current, items.length]);

  const goTo = (idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(idx);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goPrev = () => goTo((current - 1 + items.length) % items.length);
  const goNext = () => goTo((current + 1) % items.length);

  const banner = items[current];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-900" style={{ aspectRatio: '16/6' }}>
      {/* Background image */}
      <div className={cn('absolute inset-0 transition-opacity duration-700', isAnimating ? 'opacity-80' : 'opacity-100')}>
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="px-8 md:px-12 py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/40 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
            <span className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full" />
            <span className="text-emerald-300 text-xs font-medium">Halal Certified</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3">
            {banner.title}
          </h1>
          <p className="text-sm md:text-base text-gray-200 leading-relaxed mb-5 hidden sm:block">
            {banner.subtitle}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={banner.link_url}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-sm"
            >
              {banner.link_text}
            </Link>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl transition-all border border-white/30 text-sm"
            >
              View Deals
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={cn('h-1.5 rounded-full transition-all duration-300', idx === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50')}
          />
        ))}
      </div>
    </div>
  );
}
