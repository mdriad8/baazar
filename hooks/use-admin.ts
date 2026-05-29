'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/context';

export function useAdmin() {
  const { user, session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const checkedUid = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user || !session) {
      setIsAdmin(false);
      window.location.href = '/admin-baazar/login';
      return;
    }

    // Already checked this session — skip
    if (checkedUid.current === session.access_token) return;
    checkedUid.current = session.access_token;

    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/check_is_admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ p_user_id: user.id }),
      }
    )
      .then(async res => {
        if (!res.ok) throw new Error('not_admin');
        const data = await res.json();
        if (!data) throw new Error('not_admin');
        setIsAdmin(true);
      })
      .catch(() => {
        setIsAdmin(false);
        window.location.href = '/admin-baazar/login';
      });
  }, [loading, user?.id, session?.access_token]);

  const checking = loading || isAdmin === null;

  return { isAdmin: isAdmin === true, checking };
}
