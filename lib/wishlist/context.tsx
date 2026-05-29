'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { GUEST_WISHLIST_KEY, readLocalJson } from '@/lib/guest-sync';

interface WishlistContextType {
  ids: Set<string>;
  itemIdMap: Map<string, string>; // product_id -> wishlist_items.id (for logged-in users)
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  guestCount: number; // items in localStorage for guests
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function getGuestIds(): string[] {
  return readLocalJson<string[]>(GUEST_WISHLIST_KEY, []);
}

function setGuestIds(ids: string[]) {
  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [itemIdMap, setItemIdMap] = useState<Map<string, string>>(new Map());
  const syncing = useRef(false);

  // Load wishlist — from DB if logged in, from localStorage if guest
  const load = useCallback(async () => {
    if (user) {
      const { data } = await supabase
        .from('wishlist_items')
        .select('id, product_id')
        .eq('user_id', user.id);
      const newIds = new Set<string>();
      const newMap = new Map<string, string>();
      (data ?? []).forEach(row => {
        newIds.add(row.product_id);
        newMap.set(row.product_id, row.id);
      });
      setIds(newIds);
      setItemIdMap(newMap);
    } else {
      setIds(new Set(getGuestIds()));
      setItemIdMap(new Map());
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // On login, merge guest wishlist into DB
  const syncGuestToDb = useCallback(async (userId: string) => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const guestIds = getGuestIds();
      if (guestIds.length > 0) {
        const rows = guestIds.map(product_id => ({ user_id: userId, product_id }));
        const { error } = await supabase
          .from('wishlist_items')
          .upsert(rows, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
        if (!error) setGuestIds([]);
      }
    } finally {
      syncing.current = false;
    }
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      syncGuestToDb(user.id).then(() => load());
    } else {
      load();
    }
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async (productId: string) => {
    if (user) {
      if (ids.has(productId)) {
        // Delete by user_id + product_id — no need to look up the row ID,
        // which may be missing from itemIdMap if the item was synced from
        // guest localStorage after the initial load() already ran.
        await supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        setIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
        setItemIdMap(prev => { const m = new Map(prev); m.delete(productId); return m; });
      } else {
        const { data } = await supabase
          .from('wishlist_items')
          .insert({ user_id: user.id, product_id: productId })
          .select('id')
          .maybeSingle();
        if (data) {
          setIds(prev => new Set(prev).add(productId));
          setItemIdMap(prev => new Map(prev).set(productId, data.id));
        }
      }
    } else {
      // Guest: persist to localStorage
      const current = getGuestIds();
      if (current.includes(productId)) {
        const updated = current.filter(id => id !== productId);
        setGuestIds(updated);
        setIds(new Set(updated));
      } else {
        const updated = [...current, productId];
        setGuestIds(updated);
        setIds(new Set(updated));
      }
    }
  }, [user, ids, itemIdMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const isWishlisted = useCallback((productId: string) => ids.has(productId), [ids]);

  return (
    <WishlistContext.Provider value={{ ids, itemIdMap, toggle, isWishlisted, guestCount: user ? 0 : ids.size }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
