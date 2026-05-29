'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader as Loader2 } from 'lucide-react';

interface ProductFiltersProps {
  currentParams: Record<string, string>;
}

const SORT_OPTIONS = [
  { value: '', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export default function ProductFilters({ currentParams }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for price inputs — only apply on blur or Enter
  const [minPrice, setMinPrice] = useState(currentParams.min_price ?? '');
  const [maxPrice, setMaxPrice] = useState(currentParams.max_price ?? '');

  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    startTransition(() => {
      router.replace(`/products?${params.toString()}`, { scroll: false });
    });
  }, [router, searchParams, startTransition]);

  const applyPrice = useCallback((min: string, max: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set('min_price', min); else params.delete('min_price');
    if (max) params.set('max_price', max); else params.delete('max_price');
    params.delete('page');
    startTransition(() => {
      router.replace(`/products?${params.toString()}`, { scroll: false });
    });
  }, [router, searchParams, startTransition]);

  const clearAll = () => {
    const q = searchParams.get('q');
    setMinPrice('');
    setMaxPrice('');
    startTransition(() => {
      router.replace(q ? `/products?q=${q}` : '/products', { scroll: false });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {isPending && <Loader2 className="w-3.5 h-3.5 text-[hsl(var(--primary))] animate-spin" />}
        </div>
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground h-7 text-xs gap-1">
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>

      {/* Sort */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Sort By</h4>
        <div className="space-y-2">
          {SORT_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="sort"
                value={opt.value}
                checked={(currentParams.sort ?? '') === opt.value}
                onChange={() => updateParam('sort', opt.value || null)}
                className="accent-[hsl(var(--primary))]"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t" />

      {/* Diet / Type */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Dietary</h4>
        <div className="space-y-2.5">
          {[
            { key: 'halal', label: 'Halal Certified' },
          ].map(filter => (
            <div key={filter.key} className="flex items-center gap-2">
              <Checkbox
                id={filter.key}
                checked={currentParams[filter.key] === 'true'}
                onCheckedChange={v => updateParam(filter.key, v ? 'true' : null)}
                className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=checked]:border-[hsl(var(--primary))]"
              />
              <Label htmlFor={filter.key} className="text-sm text-gray-600 cursor-pointer">{filter.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" />

      {/* Storage type */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Storage Type</h4>
        <div className="space-y-2.5">
          {[
            { key: 'frozen', label: 'Frozen' },
            { key: 'chilled', label: 'Chilled / Refrigerated' },
          ].map(filter => (
            <div key={filter.key} className="flex items-center gap-2">
              <Checkbox
                id={filter.key}
                checked={currentParams[filter.key] === 'true'}
                onCheckedChange={v => updateParam(filter.key, v ? 'true' : null)}
                className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=checked]:border-[hsl(var(--primary))]"
              />
              <Label htmlFor={filter.key} className="text-sm text-gray-600 cursor-pointer">{filter.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" />

      {/* Price range */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Price Range</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Min ($)</label>
            <div className="flex items-center border rounded-lg focus-within:border-[hsl(var(--primary))] focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={minPrice}
                onChange={e => { if (/^\d*$/.test(e.target.value)) setMinPrice(e.target.value); }}
                onBlur={() => applyPrice(minPrice, maxPrice)}
                onKeyDown={e => e.key === 'Enter' && applyPrice(minPrice, maxPrice)}
                className="flex-1 min-w-0 pl-2.5 pr-1 py-1.5 text-sm focus:outline-none bg-white rounded-l-lg"
              />
              <div className="flex flex-col border-l rounded-r-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => { const v = String(Math.max(0, (parseInt(minPrice || '0') + 1))); setMinPrice(v); applyPrice(v, maxPrice); }}
                  className="px-1.5 py-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors leading-none text-[10px]"
                >▲</button>
                <button
                  type="button"
                  onClick={() => { const v = String(Math.max(0, (parseInt(minPrice || '0') - 1))); setMinPrice(v); applyPrice(v, maxPrice); }}
                  className="px-1.5 py-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors leading-none text-[10px] border-t"
                >▼</button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max ($)</label>
            <div className="flex items-center border rounded-lg focus-within:border-[hsl(var(--primary))] focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="500"
                value={maxPrice}
                onChange={e => { if (/^\d*$/.test(e.target.value)) setMaxPrice(e.target.value); }}
                onBlur={() => applyPrice(minPrice, maxPrice)}
                onKeyDown={e => e.key === 'Enter' && applyPrice(minPrice, maxPrice)}
                className="flex-1 min-w-0 pl-2.5 pr-1 py-1.5 text-sm focus:outline-none bg-white rounded-l-lg"
              />
              <div className="flex flex-col border-l rounded-r-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => { const v = String(Math.max(0, (parseInt(maxPrice || '0') + 1))); setMaxPrice(v); applyPrice(minPrice, v); }}
                  className="px-1.5 py-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors leading-none text-[10px]"
                >▲</button>
                <button
                  type="button"
                  onClick={() => { const v = String(Math.max(0, (parseInt(maxPrice || '0') - 1))); setMaxPrice(v); applyPrice(minPrice, v); }}
                  className="px-1.5 py-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors leading-none text-[10px] border-t"
                >▼</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t" />

      {/* Special */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Special</h4>
        <div className="space-y-2.5">
          {[
            { key: 'featured', label: 'Featured Products' },
            { key: 'trending', label: 'Trending Now' },
          ].map(filter => (
            <div key={filter.key} className="flex items-center gap-2">
              <Checkbox
                id={`sp_${filter.key}`}
                checked={currentParams[filter.key] === 'true'}
                onCheckedChange={v => updateParam(filter.key, v ? 'true' : null)}
                className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=checked]:border-[hsl(var(--primary))]"
              />
              <Label htmlFor={`sp_${filter.key}`} className="text-sm text-gray-600 cursor-pointer">{filter.label}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
