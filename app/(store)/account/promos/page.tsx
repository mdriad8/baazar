'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Tag, Copy, CircleCheck as CheckCircle2, Clock, CircleAlert as AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AccountLayout from '@/components/account/AccountLayout';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  expiry_date: string | null;
  is_active: boolean;
}

export default function PromosPage() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [fetching, setFetching] = useState(true);
  const [checkCode, setCheckCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ valid: boolean; message: string; promo?: PromoCode } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchPromos = async () => {
      setFetching(true);
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('promo_codes')
        .select('id, code, description, discount_type, discount_value, min_order_value, max_uses, current_uses, expiry_date, is_active')
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .order('created_at', { ascending: false });
      setPromos(data ?? []);
      setFetching(false);
    };
    fetchPromos();
  }, [user, supabase]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: `Code "${code}" copied to clipboard` });
    });
  };

  const validateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCode.trim()) return;
    setChecking(true);
    setCheckResult(null);

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', checkCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!data) {
      setCheckResult({ valid: false, message: 'This promo code is invalid or does not exist.' });
    } else if (data.expiry_date && data.expiry_date < today) {
      setCheckResult({ valid: false, message: 'This promo code has expired.' });
    } else if (data.max_uses !== null && data.current_uses >= data.max_uses) {
      setCheckResult({ valid: false, message: 'This promo code has reached its usage limit.' });
    } else {
      setCheckResult({ valid: true, message: 'Valid promo code!', promo: data as PromoCode });
    }
    setChecking(false);
  };

  const formatDiscount = (promo: PromoCode) => {
    if (promo.discount_type === 'percentage') return `${promo.discount_value}% off`;
    if (promo.discount_type === 'fixed') return `$${promo.discount_value} off`;
    return `${promo.discount_value} off`;
  };

  if (loading) return (
    <AccountLayout>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-20" />
        ))}
      </div>
    </AccountLayout>
  );
  if (!user) return null;

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Available discounts and offers</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-sm mb-3">Check a Promo Code</h2>
          <form onSubmit={validateCode} className="flex gap-2">
            <Input
              value={checkCode}
              onChange={e => setCheckCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code..."
              className="h-10 uppercase font-mono tracking-wider"
            />
            <Button type="submit" disabled={checking} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white flex-shrink-0">
              {checking ? 'Checking...' : 'Check'}
            </Button>
          </form>
          {checkResult && (
            <div className={cn(
              'mt-3 flex items-start gap-2.5 p-3 rounded-xl text-sm',
              checkResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            )}>
              {checkResult.valid
                ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={cn('font-medium', checkResult.valid ? 'text-green-700' : 'text-red-600')}>{checkResult.message}</p>
                {checkResult.promo && (
                  <p className="text-green-600 text-xs mt-0.5">
                    {formatDiscount(checkResult.promo)}
                    {checkResult.promo.min_order_value ? ` on orders over $${checkResult.promo.min_order_value}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-sm text-gray-700 mb-3">Available Offers</h2>
          {fetching ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : promos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No active promo codes</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon for exclusive deals and discounts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promos.map(promo => {
                const isExpiringSoon = promo.expiry_date && new Date(promo.expiry_date).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                const usedUp = promo.max_uses !== null && promo.current_uses >= promo.max_uses * 0.9;
                return (
                  <div key={promo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-stretch">
                      <div className="bg-[hsl(var(--secondary))] px-5 flex flex-col items-center justify-center min-w-[100px] border-r border-dashed border-[hsl(var(--primary))]/20">
                        <Tag className="w-5 h-5 text-[hsl(var(--primary))] mb-1" />
                        <span className="font-bold text-[hsl(var(--primary))] text-lg tracking-wider font-mono">{promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `$${promo.discount_value}`}</span>
                        <span className="text-[10px] text-[hsl(var(--primary))]/70">OFF</span>
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm font-mono tracking-wider">{promo.code}</p>
                              {isExpiringSoon && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> Expiring Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{promo.description || formatDiscount(promo)}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {promo.min_order_value && (
                                <span className="text-[10px] text-gray-500">Min. order ${promo.min_order_value}</span>
                              )}
                              {promo.expiry_date && (
                                <span className="text-[10px] text-gray-500">
                                  Expires {new Date(promo.expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                              {promo.max_uses && (
                                <span className={cn('text-[10px]', usedUp ? 'text-amber-600 font-medium' : 'text-gray-500')}>
                                  {promo.max_uses - promo.current_uses} uses left
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => copyCode(promo.code)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
