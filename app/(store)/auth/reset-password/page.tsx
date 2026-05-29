'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, ArrowRight, ArrowLeft, CircleCheck as CheckCircle2, KeyRound, TriangleAlert as AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'verifying' | 'password' | 'done' | 'invalid';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invalidMsg, setInvalidMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorParam) {
      setInvalidMsg(errorDesc ?? 'This link is invalid or has expired. Please request a new one.');
      setStep('invalid');
      return;
    }

    if (!code) {
      setInvalidMsg('No reset code found. Please use the link from your email or request a new one.');
      setStep('invalid');
      return;
    }

    // Exchange the code from the email link for a session
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchError }) => {
      if (exchError) {
        setInvalidMsg(
          exchError.message.toLowerCase().includes('expired')
            ? 'This reset link has expired. Please request a new one.'
            : 'This reset link is invalid. Please request a new one.'
        );
        setStep('invalid');
      } else {
        setStep('password');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStep('done');
  };

  if (step === 'verifying') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="w-8 h-8 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin block" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying reset link...</h2>
        <p className="text-sm text-gray-500">Please wait a moment.</p>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h2>
        <p className="text-sm text-gray-500 mb-6">{invalidMsg}</p>
        <div className="flex flex-col gap-3">
          <Link href="/auth/forgot-password">
            <Button className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold gap-2">
              Request New Reset Link <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full h-11 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h2>
        <p className="text-gray-500 text-sm mb-8">
          Your password has been changed successfully. You can now sign in with your new password.
        </p>
        <Button
          onClick={() => router.replace('/auth/login')}
          className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold gap-2"
        >
          Sign In <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Step: password form
  return (
    <>
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-[hsl(var(--secondary))] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-7 h-7 text-[hsl(var(--primary))]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSetPassword} className="space-y-5">
        <div>
          <Label className="text-sm font-medium">New password</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="At least 8 characters"
              className="pl-10 pr-10 h-11"
              required
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && <PasswordStrength password={password} />}
        </div>

        <div>
          <Label className="text-sm font-medium">Re-enter new password</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="Confirm new password"
              className="pl-10 pr-10 h-11"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm && password && confirm === password && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
            </p>
          )}
          {confirm && password && confirm !== password && (
            <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || password.length < 8 || password !== confirm}
          className="w-full h-11 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white font-semibold gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating...
            </span>
          ) : (
            <>Update Password <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
      </form>
    </>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const barColor = score === 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-emerald-500';
  const label = score === 1 ? 'Weak' : score === 2 ? 'Fair' : 'Strong';
  const labelColor = score === 1 ? 'text-red-500' : score === 2 ? 'text-amber-500' : 'text-emerald-600';

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? barColor : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={`text-[10px] flex items-center gap-0.5 ${c.pass ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.pass ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Baazar</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
