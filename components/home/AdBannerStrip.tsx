'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface AdCampaign {
  id: string;
  name: string;
  headline: string | null;
  tagline: string | null;
  cta_text: string | null;
  cta_url: string | null;
  banner_image_url: string | null;
  placement: string;
  products?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    sale_price: number | null;
    product_images?: { image_url: string; is_primary: boolean }[];
    seller_profiles?: { display_name: string } | null;
  } | null;
}

interface AdBannerStripProps {
  ads: AdCampaign[];
  variant?: 'wide' | 'compact';
}

function recordImpression(adId: string) {
  // Fire-and-forget impression tracking
  fetch('/api/ads/impression', { method: 'POST', body: JSON.stringify({ id: adId }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
}

export default function AdBannerStrip({ ads, variant = 'wide' }: AdBannerStripProps) {
  if (!ads.length) return null;

  if (variant === 'wide' && ads.length === 1) {
    const ad = ads[0];
    const image = ad.banner_image_url ?? ad.products?.product_images?.find(i => i.is_primary)?.image_url ?? ad.products?.product_images?.[0]?.image_url ?? null;
    const link = ad.cta_url ?? (ad.products?.slug ? `/products/${ad.products.slug}` : '/products');

    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 to-gray-700 h-32 md:h-44 group">
        {image && (
          <Image
            src={image}
            alt={ad.headline ?? ad.name}
            fill
            className="object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative h-full flex items-center px-6 md:px-8 gap-6">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Sponsored
            </span>
            <h3 className="text-white font-bold text-lg md:text-2xl leading-tight line-clamp-1">{ad.headline ?? ad.name}</h3>
            {ad.tagline && <p className="text-gray-300 text-sm mt-1 line-clamp-1">{ad.tagline}</p>}
          </div>
          <Link
            href={link}
            onClick={() => recordImpression(ad.id)}
            className="flex-shrink-0 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl text-sm hover:bg-gray-100 transition-all shadow-lg whitespace-nowrap"
          >
            {ad.cta_text ?? 'Shop Now'}
          </Link>
        </div>
      </div>
    );
  }

  // Multi-ad grid: up to 3 cards side by side
  const displayAds = ads.slice(0, 3);

  return (
    <div className={`grid gap-3 ${displayAds.length === 1 ? 'grid-cols-1' : displayAds.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {displayAds.map(ad => {
        const image = ad.banner_image_url ?? ad.products?.product_images?.find(i => i.is_primary)?.image_url ?? ad.products?.product_images?.[0]?.image_url ?? null;
        const link = ad.cta_url ?? (ad.products?.slug ? `/products/${ad.products.slug}` : '/products');
        const price = ad.products?.sale_price ?? ad.products?.price;

        return (
          <Link
            key={ad.id}
            href={link}
            onClick={() => recordImpression(ad.id)}
            className="relative overflow-hidden rounded-2xl group bg-gray-100 h-36 md:h-44 block"
          >
            {image ? (
              <Image
                src={image}
                alt={ad.headline ?? ad.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-400"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 to-emerald-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
            <div className="absolute top-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-black/40 rounded-full px-2 py-0.5 uppercase tracking-wide">
                <span className="w-1 h-1 bg-amber-400 rounded-full" /> Sponsored
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-bold text-sm line-clamp-1 leading-tight">{ad.headline ?? ad.name}</p>
              {ad.tagline && <p className="text-gray-300 text-xs mt-0.5 line-clamp-1">{ad.tagline}</p>}
              <div className="flex items-center justify-between mt-2">
                {price != null && (
                  <span className="text-emerald-300 font-bold text-sm">${price.toFixed(2)}</span>
                )}
                <span className="text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-2.5 py-1 ml-auto flex items-center gap-1">
                  {ad.cta_text ?? 'Shop Now'} <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
