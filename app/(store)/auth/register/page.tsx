'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, CircleCheck as CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { syncGuestDataToDb } from '@/lib/guest-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

function RegisterForm() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const redirectTo = searchParams.get('redirect') ?? searchParams.get('next') ?? '/account';

  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          window.location.href = redirectTo;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, redirectTo]);

  const update = (field: string, value: string | boolean) =>
    setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (!form.agreeTerms) {
      toast({ title: 'Please accept the terms and conditions', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error, needsConfirmation: confirm } = await signUp(form.email, form.password, {
      first_name: form.firstName,
      last_name: form.lastName,
      phone: form.phone,
    });

    if (error) {
      setLoading(false);
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
    } else if (confirm) {
      setLoading(false);
      setNeedsConfirmation(true);
    } else {
      // Sync guest cart + wishlist before showing success / redirecting
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await syncGuestDataToDb(supabase, userData.user.id);
      }
      setLoading(false);
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#d1fae5" strokeWidth="4" />
              <circle
                cx="40" cy="40" r="36" fill="none"
                stroke="#059669" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - countdown / 5)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Baazar!</h2>
          <p className="text-muted-foreground mb-4">
            Your account is ready. You&apos;re being taken there in{' '}
            <span className="font-semibold text-emerald-600">{countdown}</span> second{countdown !== 1 ? 's' : ''}...
          </p>
          <button
            onClick={() => { window.location.href = redirectTo; }}
            className="text-sm text-[hsl(var(--primary))] hover:underline font-medium"
          >
            Go now
          </button>
        </div>
      </div>
    );
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-4">
            We sent a confirmation link to <span className="font-medium text-gray-800">{form.email}</span>.
            Please click the link to activate your account, then sign in.
          </p>
          <Link href="/auth/login" className="text-[hsl(var(--primary))] font-semibold hover:underline text-sm">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left - branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-[hsl(var(--primary))] flex-col justify-between p-12 relative overflow-hidden">
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
        <div className="relative z-10 space-y-5">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Join Australia&apos;s Premier South Asian Marketplace
          </h2>
          {[
            'Access 10,000+ authentic products',
            'Halal certified meat & groceries',
            'Fast delivery across Australia',
            'Exclusive member deals & promos',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
              <span className="text-emerald-100">{item}</span>
            </div>
          ))}
        </div>
        <div className="relative z-10 text-emerald-100 text-sm">
          &copy; {new Date().getFullYear()} Baazar Pty Ltd, Australia
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Baazar</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-muted-foreground mb-7">Join thousands of customers shopping on Baazar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="firstName" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Ahmed" className="pl-10 h-11" required />
                </div>
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="lastName" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Khan" className="pl-10 h-11" required />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="ahmed@example.com" className="pl-10 h-11" required />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">Mobile Number</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="04XX XXX XXX" className="pl-10 h-11" />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password" type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={e => update('password', e.target.value)}
                  placeholder="Min. 8 characters" className="pl-10 pr-10 h-11" required minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Repeat password" className="pl-10 h-11" required />
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="terms" checked={form.agreeTerms}
                onCheckedChange={v => update('agreeTerms', Boolean(v))}
                className="mt-0.5 data-[state=checked]:bg-[hsl(var(--primary))] data-[state=checked]:border-[hsl(var(--primary))]"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                I agree to Baazar&apos;s{' '}
                <Link href="/terms" className="text-[hsl(var(--primary))] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[hsl(var(--primary))] hover:underline">Privacy Policy</Link>
              </Label>
            </div>

            <Button
              type="submit" disabled={loading}
              className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold text-base gap-2 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/auth/login${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-[hsl(var(--primary))] font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
