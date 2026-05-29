'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { syncGuestDataToDb } from '@/lib/guest-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const { signIn } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      setLoading(false);
      const isUnconfirmed =
        error.message.toLowerCase().includes('confirm') ||
        error.message.toLowerCase().includes('not confirmed');
      toast({
        title: 'Sign in failed',
        description: isUnconfirmed
          ? 'Please confirm your email address first. Check your inbox for the confirmation link.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    // Check if the signed-in user also has a seller account
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      // Merge guest cart + wishlist into DB before any redirect
      await syncGuestDataToDb(supabase, userData.user.id);

      const { data: sellerData } = await supabase
        .from('seller_users')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (sellerData) {
        setLoading(false);
        setIsSeller(true);
        return;
      }
    }

    // Use window.location for a hard navigation — router.replace can silently
    // fail on mobile when the auth state change fires concurrently.
    const next = searchParams.get('redirect') ?? searchParams.get('next') ?? '/account';
    window.location.href = next;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(var(--primary))] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-64 h-64 bg-white rounded-full" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-white rounded-full" />
        </div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-white">Baazar</span>
          </Link>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4">
            South Asia&apos;s Flavours,<br />Delivered to Australia
          </h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Fresh halal meat, authentic spices, basmati rice and everything you love from back home.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { num: '50K+', label: 'Happy Customers' },
              { num: '500+', label: 'Sellers' },
              { num: '10K+', label: 'Products' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{s.num}</div>
                <div className="text-xs text-emerald-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <span className="w-2 h-2 bg-white/50 rounded-full" />
          <span className="text-emerald-100 text-sm">Halal certified products from verified sellers</span>
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Baazar</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your Baazar account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-11"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs text-[hsl(var(--primary))] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold text-base gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          {isSeller && (
            <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-emerald-800">You also have a seller account</p>
              <p className="text-xs text-emerald-700">Where would you like to go?</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => { window.location.href = '/seller-dashboard'; }}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-sm gap-2"
                  size="sm"
                >
                  <Store className="w-3.5 h-3.5" /> Seller Dashboard
                </Button>
                <Button
                  onClick={() => { window.location.href = searchParams.get('redirect') ?? searchParams.get('next') ?? '/account'; }}
                  variant="outline"
                  className="flex-1 text-sm border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  size="sm"
                >
                  Continue as Customer
                </Button>
              </div>
            </div>
          )}

          {!isSeller && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-[hsl(var(--primary))] font-semibold hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Are you a seller?{' '}
              <Link href="/seller-apply" className="text-[hsl(var(--primary))] hover:underline font-medium">
                Apply to sell on Baazar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
