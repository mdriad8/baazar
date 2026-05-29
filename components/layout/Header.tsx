'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Search, User, Heart, Menu, X, MapPin,
  ChevronDown, Bell, Package, LogOut, Settings, Store,
  ShoppingBag, Tag, CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useCart } from '@/lib/cart/context';
import { useWishlist } from '@/lib/wishlist/context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

const NAV_CATEGORIES = [
  { name: 'Groceries', href: '/category/groceries' },
  { name: 'Halal Meat', href: '/category/halal-meat' },
  { name: 'Seafood', href: '/category/seafood' },
  { name: 'Frozen & Chilled', href: '/category/frozen-chilled' },
  { name: 'Rice & Grains', href: '/category/rice-grains' },
  { name: 'Spices', href: '/category/spices-condiments' },
];

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  order: <ShoppingBag className="w-4 h-4 text-blue-500" />,
  promo: <Tag className="w-4 h-4 text-orange-500" />,
  info: <Bell className="w-4 h-4 text-gray-400" />,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSeller, setIsSeller] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, signOut, loading } = useAuth();
  const { itemCount } = useCart();
  const { ids: wishlistIds } = useWishlist();
  const wishlistCount = wishlistIds.size;
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await signOut();
    // replace() avoids adding to browser history and bypasses Next.js
    // client-side router so the page does a true server-side reload,
    // ensuring no stale React/auth state survives.
    window.location.replace('/');
  };

  useEffect(() => {
    if (!user) { setIsSeller(false); return; }
    supabase.from('seller_users').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
      .then(({ data }) => setIsSeller(!!data));
  }, [user, supabase]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    setNotifLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, is_read, action_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
    setNotifLoading(false);
  };

  const toggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && notifications.length === 0) loadNotifications();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white border-b border-gray-100'}`}>
        {/* Top bar */}
        <div className="bg-[hsl(var(--primary))] text-white text-xs py-1.5">
          <div className="container-page flex items-center justify-between gap-2 overflow-hidden">
            <span className="flex items-center gap-1 whitespace-nowrap truncate min-w-0">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:inline">Free delivery on orders over $80 &nbsp;·&nbsp; Sydney, Melbourne, Brisbane, Perth</span>
              <span className="sm:hidden">Free delivery over $80</span>
            </span>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href="/seller-apply" className="hover:underline whitespace-nowrap hidden sm:inline">Sell on Baazar</Link>
              <span className="hidden sm:inline text-white/50">|</span>
              <Link href="/account/support" className="hover:underline whitespace-nowrap">Help</Link>
              <span className="text-white/50">|</span>
              <Link href="/account/orders" className="hover:underline whitespace-nowrap">Track</Link>
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="container-page">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Baa<span className="text-[hsl(var(--primary))]">zar</span>
              </span>
            </Link>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search for halal meat, spices, rice, groceries..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent bg-gray-50 transition-all"
                />
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Wishlist — visible on all screen sizes */}
              <Link href="/account/wishlist">
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 text-white border-0">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Notifications dropdown */}
              {!loading && user && (
                <div ref={notifRef} className="relative hidden md:block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={toggleNotif}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                          >
                            <CheckCheck className="w-3 h-3" /> Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifLoading ? (
                          <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                                  <div className="h-2.5 bg-gray-100 rounded w-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="py-10 text-center">
                            <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400 font-medium">No notifications yet</p>
                            <p className="text-xs text-gray-300 mt-0.5">You're all caught up!</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {notifications.map(n => (
                              <div
                                key={n.id}
                                className={`flex gap-3 p-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                                onClick={() => {
                                  markRead(n.id);
                                  if (n.action_url) router.push(n.action_url);
                                  setNotifOpen(false);
                                }}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.is_read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                  {NOTIF_ICONS[n.type] ?? <Bell className="w-4 h-4 text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                      {n.title}
                                    </p>
                                    {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t px-4 py-2.5 bg-gray-50">
                        <Link
                          href="/account"
                          className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
                          onClick={() => setNotifOpen(false)}
                        >
                          View all in account
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User menu */}
              {loading ? (
                <div className="hidden md:flex w-20 h-8 bg-gray-100 rounded-lg animate-pulse" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hidden md:flex items-center gap-1.5 text-sm">
                      <div className="w-7 h-7 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 text-sm text-muted-foreground border-b mb-1 truncate">
                      {user.email}
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" /> My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders" className="flex items-center gap-2 cursor-pointer">
                        <Package className="w-4 h-4" /> My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/wishlist" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="w-4 h-4" /> Wishlist
                      </Link>
                    </DropdownMenuItem>
                    {isSeller ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/seller-dashboard" className="flex items-center gap-2 cursor-pointer">
                            <Store className="w-4 h-4" /> Seller Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/seller-apply" className="flex items-center gap-2 cursor-pointer text-[hsl(var(--primary))]">
                            <Store className="w-4 h-4" /> Become a Seller
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 flex items-center gap-2 cursor-pointer"
                      onSelect={() => { handleSignOut(); }}
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white">
                      Register
                    </Button>
                  </Link>
                </div>
              )}

              {/* Cart */}
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-[hsl(var(--primary))] text-white border-0">
                      {itemCount > 99 ? '99+' : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Mobile menu */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Category navigation */}
          <nav className="hidden md:flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide">
            <Link href="/products" className="text-sm font-medium text-gray-700 hover:text-[hsl(var(--primary))] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] transition-all whitespace-nowrap">
              All Products
            </Link>
            {NAV_CATEGORIES.map(cat => (
              <Link
                key={cat.href}
                href={cat.href}
                className="text-sm font-medium text-gray-700 hover:text-[hsl(var(--primary))] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] transition-all whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
            <Link href="/products?halal=true" className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all whitespace-nowrap flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Halal Certified
            </Link>
            <Link href="/products?sale=true" className="text-sm font-semibold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-all whitespace-nowrap">
              Deals & Offers
            </Link>
          </nav>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search groceries, meat, spices..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] bg-gray-50"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white overflow-y-auto">
            <div className="p-4 border-b bg-[hsl(var(--primary))]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="text-xl font-bold text-white">Baazar</span>
              </div>
              {user ? (
                <div className="mt-3 text-sm text-white/80">{user.email}</div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="outline" className="border-white text-white hover:bg-white/10 bg-transparent">Sign In</Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="bg-white text-[hsl(var(--primary))] hover:bg-white/90">Register</Button>
                  </Link>
                </div>
              )}
            </div>

            <nav className="p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shop By Category</p>
              <Link
                href="/products"
                className="flex items-center gap-3 py-2.5 px-3 text-sm font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] rounded-lg transition-all"
                onClick={() => setMobileOpen(false)}
              >
                <ShoppingBag className="w-4 h-4" />
                All Products
              </Link>
              {NAV_CATEGORIES.map(cat => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="flex items-center py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))] rounded-lg transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
              <div className="my-3 border-t" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Account</p>
              <Link href="/account/wishlist" className="flex items-center justify-between py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-[hsl(var(--accent))] rounded-lg" onClick={() => setMobileOpen(false)}>
                <span className="flex items-center gap-3"><Heart className="w-4 h-4" /> Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{wishlistCount}</span>
                )}
              </Link>
              {user && (
                <>
                  <Link href="/account" className="flex items-center gap-3 py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-[hsl(var(--accent))] rounded-lg" onClick={() => setMobileOpen(false)}>
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link href="/account/orders" className="flex items-center gap-3 py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-[hsl(var(--accent))] rounded-lg" onClick={() => setMobileOpen(false)}>
                    <Package className="w-4 h-4" /> Orders
                  </Link>
                  <div className="mt-4 pt-4 border-t">
                    <button
                      className="flex items-center gap-3 py-2.5 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg w-full"
                      onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
