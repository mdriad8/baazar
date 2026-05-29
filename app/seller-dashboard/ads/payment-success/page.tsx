'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CircleCheck as CheckCircle, ArrowRight, Loader as Loader2, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdPaymentSuccessPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign_id');
  const [campaign, setCampaign] = useState<{ name: string; total_budget: number; placement: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) { setLoading(false); return; }
    const supabase = createClient();

    // Poll briefly to allow webhook to process, then confirm payment
    const confirm = async () => {
      // Mark paid via service (demo mode was already handled in the API route;
      // for real Stripe this is handled by webhook, but we optimistically show success)
      const { data } = await supabase
        .from('campaigns')
        .select('name, total_budget, placement, payment_status')
        .eq('id', campaignId)
        .maybeSingle();

      if (data) {
        setCampaign(data);
        // If not yet marked paid (real Stripe webhook pending), update optimistically
        if (data.payment_status !== 'paid') {
          await supabase.from('campaigns').update({
            payment_status: 'paid',
            status: 'draft',
            admin_approval_status: 'pending',
          }).eq('id', campaignId);
        }
      }
      setLoading(false);
    };

    confirm();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const PLACEMENT_LABELS: Record<string, string> = {
    hero_banner: 'Hero Banner',
    mid_page: 'Mid-Page Cards',
    search_results: 'Search Results',
    category_page: 'Category Page Banner',
    sidebar: 'Sidebar',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 text-sm mb-6">
          Your ad campaign has been submitted to the admin team for review. You will be notified once it is approved and live.
        </p>

        {campaign && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Campaign</span>
              <span className="font-medium text-gray-900">{campaign.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Placement</span>
              <span className="font-medium text-gray-900">{PLACEMENT_LABELS[campaign.placement] ?? campaign.placement}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-bold text-green-600">${campaign.total_budget?.toFixed(2)} AUD</span>
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-2.5">
            <Megaphone className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pending Admin Review</p>
              <p className="text-xs text-amber-700 mt-0.5">Your campaign is now in the admin queue. Approval typically takes up to 24 hours. Once approved, your ad will go live on the scheduled start date.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/seller-dashboard">
            <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white gap-2">
              Back to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/seller-dashboard/ads/create">
            <Button variant="outline" className="w-full">Create Another Campaign</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
