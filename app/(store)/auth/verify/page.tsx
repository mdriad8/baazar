'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Status = 'verifying' | 'success' | 'error';

function VerifyContent() {
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setErrorMsg(errorDesc ?? 'Verification failed. The link may have expired.');
      return;
    }

    if (!code) {
      // Supabase may pass token via hash fragment — handled by the client SDK automatically
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setStatus('success');
          setTimeout(() => router.replace('/account'), 2000);
        } else {
          setStatus('error');
          setErrorMsg('No verification token found. Please try registering again.');
        }
      });
      return;
    }

    // Exchange the code for a session
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus('error');
        setErrorMsg(error.message.includes('expired')
          ? 'This verification link has expired. Please register again.'
          : error.message);
      } else {
        setStatus('success');
        setTimeout(() => router.replace('/account'), 2000);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="w-8 h-8 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin block" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
        <p className="text-muted-foreground">Please wait a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
        <p className="text-muted-foreground">Your account is ready. Taking you to your profile...</p>
        <div className="mt-4 flex justify-center">
          <span className="w-5 h-5 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin block" />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
      <p className="text-muted-foreground mb-6">{errorMsg}</p>
      <div className="flex flex-col gap-3">
        <Link href="/auth/register">
          <Button className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold">
            Register Again
          </Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full h-11">
            Sign In Instead
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Baazar</span>
          </div>
        </div>
        <Suspense>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
