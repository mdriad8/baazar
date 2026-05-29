'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Store, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SellerLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, check if they have a seller account and redirect directly
  useEffect(() => {
    if (authLoading || !user) return;
    setChecking(true);
    supabase
      .from('seller_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          window.location.href = '/seller-dashboard';
        } else {
          // Logged in as customer only — show the form pre-filled but let them proceed
          setChecking(false);
        }
      });
  }, [user, authLoading, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Invalid email or password.' : authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: sellerUser } = await supabase
        .from('seller_users')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!sellerUser) {
        // Don't sign them out — they may be a customer too
        setError('No active seller account found for this email. If you are a customer, you can continue shopping without signing out.');
        setLoading(false);
        return;
      }

      window.location.href = '/seller-dashboard';
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-white">Baazar</span>
          </Link>
        </div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
            <Store className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">Seller Portal</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Manage your products, track orders, and grow your business on Baazar.
          </p>
          <div className="space-y-4">
            {[
              'List unlimited halal-certified products',
              'Real-time order and inventory management',
              'Access analytics and sales insights',
              'Dedicated seller support team',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-gray-300 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-gray-600">
            Not a seller yet?{' '}
            <Link href="/seller-apply" className="text-emerald-500 hover:text-emerald-400 underline">
              Apply to sell on Baazar
            </Link>
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Baazar</span>
            <span className="text-sm text-gray-500 ml-1">Seller Portal</span>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-gray-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Sign In</h1>
            <p className="text-gray-500 text-sm">Access your seller dashboard</p>
          </div>

          {/* Already logged in as customer notice */}
          {user && !checking && (
            <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <p className="font-semibold mb-1">Signed in as {user.email}</p>
              <p className="text-blue-600 text-xs">Your account does not have seller access. Sign in below with a seller account, or{' '}
                <Link href="/" className="underline font-medium">return to the store</Link>.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seller@example.com"
                  required
                  className="pl-10 h-11"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Sign In to Seller Portal
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t space-y-3 text-center">
            <p className="text-xs text-gray-400">
              This portal is for approved sellers only. No self-registration.
            </p>
            <p className="text-xs text-gray-500">
              Want to become a seller?{' '}
              <Link href="/seller-apply" className="text-emerald-600 hover:underline font-medium">
                Apply here
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              <Link href="/" className="text-gray-400 hover:text-gray-600">
                Return to Baazar store
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
