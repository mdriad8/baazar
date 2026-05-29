import { SupabaseClient } from '@supabase/supabase-js';

export const GUEST_CART_KEY = 'baazar_guest_cart';
export const GUEST_WISHLIST_KEY = 'baazar_guest_wishlist';

export interface GuestCartEntry {
  product_id: string;
  quantity: number;
  unit_type: string;
  saved_for_later: boolean;
}

export function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

/**
 * Merges guest cart + wishlist from localStorage into the DB for the given user,
 * then clears the local copies. Safe to call multiple times — uses upsert.
 * Only clears localStorage if the DB write succeeded.
 */
export async function syncGuestDataToDb(supabase: SupabaseClient, userId: string): Promise<void> {
  const cartEntries = readLocalJson<GuestCartEntry[]>(GUEST_CART_KEY, []);
  const wishlistIds = readLocalJson<string[]>(GUEST_WISHLIST_KEY, []);

  if (cartEntries.length > 0) {
    const rows = cartEntries.map(e => ({
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
    if (!error) localStorage.removeItem(GUEST_CART_KEY);
  }

  if (wishlistIds.length > 0) {
    const rows = wishlistIds.map(product_id => ({ user_id: userId, product_id }));
    const { error } = await supabase
      .from('wishlist_items')
      .upsert(rows, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
    if (!error) localStorage.removeItem(GUEST_WISHLIST_KEY);
  }
}
