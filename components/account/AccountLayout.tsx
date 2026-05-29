'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';
import { User, Package, Heart, MapPin, Star, Tag, Settings, Camera, Award, Headphones as HeadphonesIcon, ChevronRight, Loader as Loader2, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  first_name: string;
  last_name: string;
  avatar_url: string;
  total_orders: number;
  total_spending: number;
  loyalty_points: number;
}

const NAV_ITEMS = [
  { href: '/account', icon: User, label: 'My Account', exact: true },
  { href: '/account/orders', icon: Package, label: 'My Orders', exact: false },
  { href: '/account/wishlist', icon: Heart, label: 'Wishlist', exact: false },
  { href: '/account/addresses', icon: MapPin, label: 'Addresses', exact: false },
  { href: '/account/reviews', icon: Star, label: 'My Reviews', exact: false },
  { href: '/account/promos', icon: Tag, label: 'Promo Codes', exact: false },
  { href: '/account/support', icon: HeadphonesIcon, label: 'Support', exact: false },
  { href: '/account/settings', icon: Settings, label: 'Settings', exact: false },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.replace('/');
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('customer_profiles')
      .select('first_name, last_name, avatar_url, total_orders, total_spending, loyalty_points')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user, supabase]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please choose an image under 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('customer_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (dbError) throw new Error(dbError.message);

      setProfile(prev => prev ? { ...prev, avatar_url: urlWithBust } : prev);
      toast({ title: 'Profile picture updated' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const displayName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || user?.email
    : user?.email;

  const currentNavItem = NAV_ITEMS.find(item =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <>
      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col overflow-hidden shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-[hsl(var(--secondary))]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white font-bold overflow-hidden">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    : (profile?.first_name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {NAV_ITEMS.map(item => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] border-l-2 border-l-[hsl(var(--primary))]'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-[hsl(var(--primary))]'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[hsl(var(--primary))]" />}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-4">
              <button
                onClick={() => { setMobileNavOpen(false); handleSignOut(); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 min-h-screen">
        {/* Mobile top bar — shows current section + hamburger */}
        <div className="lg:hidden bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="container-page flex items-center gap-3 h-14">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Account menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {currentNavItem && <currentNavItem.icon className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />}
              <span className="font-semibold text-gray-900 text-sm truncate">
                {currentNavItem?.label ?? 'My Account'}
              </span>
            </div>
          </div>
        </div>

        <div className="container-page py-4 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-4">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (profile?.first_name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-[hsl(var(--primary))] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[hsl(142,74%,24%)] transition-colors disabled:opacity-70"
                      title="Change profile picture"
                    >
                      {uploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Camera className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                  <h2 className="font-bold text-gray-900 mt-3">{displayName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                  {profile?.loyalty_points ? (
                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700">{profile.loyalty_points} points</span>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[hsl(var(--primary))]">{profile?.total_orders ?? 0}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-[hsl(var(--primary))]">${(profile?.total_spending ?? 0).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Spent</div>
                  </div>
                </div>
              </div>

              <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {NAV_ITEMS.map(item => {
                  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b last:border-0',
                        active
                          ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] border-l-2 border-l-[hsl(var(--primary))]'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-[hsl(var(--primary))]'
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <div className="lg:col-span-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
