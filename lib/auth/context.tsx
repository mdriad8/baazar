'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, meta?: Record<string, string>) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearSupabaseStorage() {
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('sb-')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

function clearSupabaseCookies() {
  if (typeof document === 'undefined') return;
  document.cookie.split(';').forEach(c => {
    const name = c.trim().split('=')[0];
    if (name.startsWith('sb-')) {
      // Clear with multiple path/domain combinations to cover all cases
      const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `${name}=; ${expire}; path=/`;
      document.cookie = `${name}=; ${expire}; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; ${expire}; path=/; domain=.${window.location.hostname}`;
    }
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable ref — never changes, never triggers useEffect re-runs.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session?.user) {
        (async () => {
          await supabase.from('customer_profiles').upsert({
            user_id: session.user.id,
            first_name: session.user.user_metadata?.first_name ?? '',
            last_name: session.user.user_metadata?.last_name ?? '',
          }, { onConflict: 'user_id', ignoreDuplicates: true });
        })();
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, meta?: Record<string, string>) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) return { error: error as Error | null };

    if (signUpData.session) {
      setSession(signUpData.session);
      setUser(signUpData.session.user);
      if (meta) sendWelcomeEmail(email, meta.first_name ?? '');
      return { error: null };
    }

    if (signUpData.user?.id) {
      await supabase.rpc('confirm_user_email', { user_id: signUpData.user.id });
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const isEmailUnconfirmed =
        signInError.message.toLowerCase().includes('confirm') ||
        signInError.message.toLowerCase().includes('not confirmed');
      if (isEmailUnconfirmed) return { error: null, needsConfirmation: true };
      return { error: signInError as Error | null };
    }

    if (signInData.session) {
      setSession(signInData.session);
      setUser(signInData.session.user);
      if (meta) sendWelcomeEmail(email, meta.first_name ?? '');
    }
    return { error: null };
  };

  const signOut = async () => {
    // Clear React state immediately so the UI reflects signed-out status
    // even before the network round-trip completes.
    setUser(null);
    setSession(null);

    // Clear every Supabase key from localStorage and cookies first so that
    // even if the network call fails, no stale token can re-hydrate the session.
    clearSupabaseStorage();
    clearSupabaseCookies();

    // Await the SDK signOut — this is what actually clears the @supabase/ssr
    // managed cookies (auth-token chunks). Without awaiting, cookies survive a
    // hard page reload and getSession() re-hydrates the session from them.
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      // Network failure: session is already cleared locally above, proceed.
    }

    // Run one final local clear in case signOut re-set any cookies.
    clearSupabaseStorage();
    clearSupabaseCookies();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

function sendWelcomeEmail(email: string, firstName: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
    body: JSON.stringify({ email, first_name: firstName }),
  }).catch(() => {});
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
