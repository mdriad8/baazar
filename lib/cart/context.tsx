'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { GUEST_CART_KEY, GuestCartEntry, readLocalJson } from '@/lib/guest-sync';

export interface CartItem {
  id: string;           // DB row id (logged in) or product_id (guest)
  product_id: string;
  quantity: number;
  unit_type: string;
  saved_for_later: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    sale_price: number | null;
    stock_status: string;
    is_halal: boolean;
    storage_type: string;
    primary_image?: string;
    seller_id?: string | null;
    seller_name?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  isGuest: boolean;
  addItem: (productId: string, quantity?: number, unitType?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  saveForLater: (cartItemId: string) => Promise<void>;
  moveToCart: (cartItemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readGuestCart(): GuestCartEntry[] {
  return readLocalJson<GuestCartEntry[]>(GUEST_CART_KEY, []);
}

function writeGuestCart(entries: GuestCartEntry[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const syncing = useRef(false);

  // ─── Fetch product details for guest cart entries ─────────────────────────
  const hydrateGuestCart = useCallback(async (entries: GuestCartEntry[]): Promise<CartItem[]> => {
    if (entries.length === 0) return [];
    const ids = entries.map(e => e.product_id);
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, slug, price, sale_price, stock_status, is_halal, storage_type, seller_id,
        product_images(image_url, is_primary),
        seller_profiles(display_name)
      `)
      .in('id', ids);

    const productMap = new Map<string, CartItem['product']>();
    (data ?? []).forEach((p: Record<string, unknown>) => {
      const images = (p.product_images as Array<{image_url: string; is_primary: boolean}>) ?? [];
      const primaryImg = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
      const seller = p.seller_profiles as {display_name: string} | null;
      productMap.set(p.id as string, {
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        price: p.price as number,
        sale_price: p.sale_price as number | null,
        stock_status: p.stock_status as string,
        is_halal: p.is_halal as boolean,
        storage_type: p.storage_type as string,
        primary_image: primaryImg,
        seller_id: p.seller_id as string | null,
        seller_name: seller?.display_name ?? 'Baazar',
      });
    });

    return entries
      .filter(e => productMap.has(e.product_id))
      .map(e => ({
        id: e.product_id,          // use product_id as the "row id" for guest
        product_id: e.product_id,
        quantity: e.quantity,
        unit_type: e.unit_type,
        saved_for_later: e.saved_for_later,
        product: productMap.get(e.product_id)!,
      }));
  }, [supabase]);

  // ─── Fetch DB cart (logged in) ────────────────────────────────────────────
  const fetchDbCart = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cart_items')
        .select(`
          id, product_id, quantity, unit_type, saved_for_later,
          products(id, name, slug, price, sale_price, stock_status, is_halal, storage_type, seller_id,
            product_images(image_url, is_primary),
            seller_profiles(display_name)
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (data) {
        const mapped = data.map((item: Record<string, unknown>) => {
          const p = item.products as Record<string, unknown>;
          const images = (p?.product_images as Array<{image_url: string; is_primary: boolean}>) ?? [];
          const primaryImg = images.find(i => i.is_primary)?.image_url ?? images[0]?.image_url ?? '';
          const sellers = p?.seller_profiles as {display_name: string} | null;
          return {
            id: item.id as string,
            product_id: item.product_id as string,
            quantity: item.quantity as number,
            unit_type: item.unit_type as string,
            saved_for_later: item.saved_for_later as boolean,
            product: {
              id: p?.id as string,
              name: p?.name as string,
              slug: p?.slug as string,
              price: p?.price as number,
              sale_price: p?.sale_price as number | null,
              stock_status: p?.stock_status as string,
              is_halal: p?.is_halal as boolean,
              storage_type: p?.storage_type as string,
              primary_image: primaryImg,
              seller_id: p?.seller_id as string | null,
              seller_name: sellers?.display_name ?? 'Baazar',
            },
          };
        });
        setItems(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // ─── Merge guest cart into DB on login ────────────────────────────────────
  const syncGuestToDb = useCallback(async (userId: string) => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const guestEntries = readGuestCart();
      if (guestEntries.length > 0) {
        const rows = guestEntries.map(e => ({
          user_id: userId,
          product_id: e.product_id,
          quantity: e.quantity,
          unit_type: e.unit_type,
          saved_for_later: e.saved_for_later,
          sku_id: null,
        }));
        const { error } = await supabase
          .from('cart_items')
          .upsert(rows, { onConflict: 'user_id,product_id,sku_id' });
        if (!error) clearGuestCart();
      }
    } finally {
      syncing.current = false;
    }
  }, [supabase]);

  // ─── Load cart on auth change ─────────────────────────────────────────────
  useEffect(() => {
    // Wait for auth to finish initialising — avoids a flash of empty cart
    // when the page loads and the session is still being restored from storage.
    if (authLoading) return;

    if (user) {
      syncGuestToDb(user.id).then(() => fetchDbCart());
    } else {
      // Guest: hydrate from localStorage
      const entries = readGuestCart();
      if (entries.length === 0) {
        setItems([]);
      } else {
        setLoading(true);
        hydrateGuestCart(entries)
          .then(setItems)
          .finally(() => setLoading(false));
      }
    }
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ─────────────────────────────────────────────────────────────
  const addItem = async (productId: string, quantity = 1, unitType = 'each') => {
    if (user) {
      // Check if item already exists — if so increment, otherwise insert
      const existing = items.find(i => i.product_id === productId && !i.saved_for_later);
      if (existing) {
        await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          unit_type: unitType,
          sku_id: null,
          saved_for_later: false,
        });
      }
      await fetchDbCart();
    } else {
      const entries = readGuestCart();
      const existing = entries.find(e => e.product_id === productId);
      let updated: GuestCartEntry[];
      if (existing) {
        updated = entries.map(e =>
          e.product_id === productId ? { ...e, quantity: e.quantity + quantity } : e
        );
      } else {
        updated = [...entries, { product_id: productId, quantity, unit_type: unitType, saved_for_later: false }];
      }
      writeGuestCart(updated);
      setLoading(true);
      hydrateGuestCart(updated).then(setItems).finally(() => setLoading(false));
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) { await removeItem(cartItemId); return; }
    if (user) {
      await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
      await fetchDbCart();
    } else {
      const updated = readGuestCart().map(e =>
        e.product_id === cartItemId ? { ...e, quantity } : e
      );
      writeGuestCart(updated);
      hydrateGuestCart(updated).then(setItems);
    }
  };

  const removeItem = async (cartItemId: string) => {
    if (user) {
      await supabase.from('cart_items').delete().eq('id', cartItemId);
      await fetchDbCart();
    } else {
      const updated = readGuestCart().filter(e => e.product_id !== cartItemId);
      writeGuestCart(updated);
      hydrateGuestCart(updated).then(setItems);
    }
  };

  const clearCart = async () => {
    if (user) {
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    } else {
      clearGuestCart();
    }
    setItems([]);
  };

  const saveForLater = async (cartItemId: string) => {
    if (user) {
      await supabase.from('cart_items').update({ saved_for_later: true }).eq('id', cartItemId);
      await fetchDbCart();
    } else {
      const updated = readGuestCart().map(e =>
        e.product_id === cartItemId ? { ...e, saved_for_later: true } : e
      );
      writeGuestCart(updated);
      hydrateGuestCart(updated).then(setItems);
    }
  };

  const moveToCart = async (cartItemId: string) => {
    if (user) {
      await supabase.from('cart_items').update({ saved_for_later: false }).eq('id', cartItemId);
      await fetchDbCart();
    } else {
      const updated = readGuestCart().map(e =>
        e.product_id === cartItemId ? { ...e, saved_for_later: false } : e
      );
      writeGuestCart(updated);
      hydrateGuestCart(updated).then(setItems);
    }
  };

  const activeItems = items.filter(i => !i.saved_for_later);
  const itemCount = activeItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = activeItems.reduce((sum, i) => {
    const price = i.product.sale_price ?? i.product.price;
    return sum + price * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      items, loading, itemCount, subtotal,
      isGuest: !user,
      addItem, updateQuantity, removeItem, clearCart,
      saveForLater, moveToCart, refresh: user ? fetchDbCart : async () => {
        const entries = readGuestCart();
        hydrateGuestCart(entries).then(setItems);
      },
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
