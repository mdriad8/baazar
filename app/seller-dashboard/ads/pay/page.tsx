'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { CreditCard, Megaphone, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  placement: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  daily_budget: number;
  total_budget: number;
  payment_status: string;
  status: string;
}

const PLACEMENT_LABELS: Record<string, string> = {
  hero_banner: 'Hero Banner',
  mid_page: 'Mid-Page Cards',
  search_results: 'Search Results',
  category_page: 'Category Page Banner',
  sidebar: 'Sidebar',
};

export default function AdPayPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign_id');
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [fetching, setFetching] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/seller-dashboard/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !campaignId) { setFetching(false); return; }
    const supabase = createClient();
    supabase
      .from('campaigns')
      .select('id, name, placement, start_date, end_date, number_of_days, daily_budget, total_budget, payment_status, status')
      .eq('id', campaignId)
      .maybeSingle()
      .then(({ data }) => {
        setCampaign(data);
        setFetching(false);
      });
  }, [user, campaignId]);

  const handlePay = async () => {
    if (!campaign) return;
    setPaying(true);
    try {
      const res = await fetch('/api/payments/stripe/create-ad-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payment failed');
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err) {
      toast({ title: 'Payment error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      setPaying(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Campaign not found</p>
          <Link href="/seller-dashboard" className="text-sm text-emerald-600 underline mt-2 inline-block">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (campaign.payment_status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Already Paid</h2>
          <p className="text-gray-500 text-sm mb-5">This campaign has been paid for and is pending admin approval.</p>
          <Link href="/seller-dashboard"><Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Complete Payment</h1>
            <p className="text-xs text-gray-500">Activate your ad campaign</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Campaign</span>
            <span className="font-medium text-gray-900 max-w-[200px] text-right truncate">{campaign.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Placement</span>
            <span className="font-medium">{PLACEMENT_LABELS[campaign.placement] ?? campaign.placement}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="font-medium">{campaign.number_of_days} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Daily Rate</span>
            <span className="font-medium">${campaign.daily_budget?.toFixed(2)}/day</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="font-semibold">Total Due</span>
            <span className="font-bold text-emerald-600 text-base">${campaign.total_budget?.toFixed(2)} AUD</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-xs text-blue-700">
          <p className="font-semibold mb-1">What happens after payment?</p>
          <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
            <li>Your campaign is submitted to the admin team</li>
            <li>Admin reviews and approves within 24 hours</li>
            <li>Your ad goes live on the scheduled start date</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handlePay}
            disabled={paying}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base gap-2"
          >
            {paying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Pay ${campaign.total_budget?.toFixed(2)} AUD</>
            )}
          </Button>
          <Link href="/seller-dashboard">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Pay Later
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Secured by Stripe. Your payment information is never stored on our servers.</p>
      </div>
    </div>
  );
}
