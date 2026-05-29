'use client';

import { useSearchParams } from 'next/navigation';
import { Circle as XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdPaymentCancelPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign_id');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-9 h-9 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-500 text-sm mb-6">
          Your campaign has been saved as a draft. No payment was collected. You can retry payment at any time from your dashboard.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-600">
          Your campaign details are saved. Complete payment whenever you are ready to submit it for review.
        </div>

        <div className="flex flex-col gap-3">
          {campaignId && (
            <Link href={`/seller-dashboard/ads/pay?campaign_id=${campaignId}`}>
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white gap-2">
                <RefreshCw className="w-4 h-4" /> Retry Payment
              </Button>
            </Link>
          )}
          <Link href="/seller-dashboard">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
