'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { User, Package, Heart, MapPin, Star, Tag, Settings, CreditCard as Edit2, Camera, ShoppingBag, TrendingUp, Award, Headphones as HeadphonesIcon, ChevronRight, Clock, CircleCheck as CheckCircle2, Truck, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
  total_orders: number;
  total_spending: number;
  loyalty_points: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  placed: { label: 'Order Placed', color: 'text-blue-600 bg-blue-50', icon: Package },
  payment_confirmed: { label: 'Confirmed', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
  picking: { label: 'Picking', color: 'text-yellow-600 bg-yellow-50', icon: ShoppingBag },
  packing: { label: 'Packing', color: 'text-yellow-600 bg-yellow-50', icon: Package },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-600 bg-orange-50', icon: Truck },
  nearby: { label: 'Nearby', color: 'text-orange-600 bg-orange-50', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: AlertCircle },
};

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [uploading, setUploading] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please choose an image under 5MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      await fetch(`${supabaseUrl}/storage/v1/object/avatars/${path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ message: uploadRes.statusText }));
        throw new Error(err.message ?? 'Upload failed');
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
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

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, ordersRes] = await Promise.all([
        supabase.from('customer_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('orders').select('id, order_number, total_amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    };

    fetchData();
  }, [user, supabase]);

  if (loading || !user) return null;

  const displayName = profile ? `${profile.first_name} ${profile.last_name}`.trim() || user.email : user.email;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-page py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-4">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (profile?.first_name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()
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
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <h2 className="font-bold text-gray-900 mt-3">{displayName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
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

            {/* Navigation */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {[
                { href: '/account', icon: User, label: 'My Account', exact: true },
                { href: '/account/orders', icon: Package, label: 'My Orders', exact: false },
                { href: '/account/wishlist', icon: Heart, label: 'Wishlist', exact: false },
                { href: '/account/addresses', icon: MapPin, label: 'Addresses', exact: false },
                { href: '/account/reviews', icon: Star, label: 'My Reviews', exact: false },
                { href: '/account/promos', icon: Tag, label: 'Promo Codes', exact: false },
                { href: '/account/support', icon: HeadphonesIcon, label: 'Support', exact: false },
                { href: '/account/settings', icon: Settings, label: 'Settings', exact: false },
              ].map(item => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3 space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Orders', value: profile?.total_orders ?? 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Total Spent', value: `$${(profile?.total_spending ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'text-[hsl(var(--primary))]', bg: 'bg-[hsl(var(--secondary))]' },
                { label: 'Loyalty Points', value: profile?.loyalty_points ?? 0, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="font-bold">Recent Orders</h3>
                <Link href="/account/orders" className="text-sm text-[hsl(var(--primary))] font-medium hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start shopping to see your orders here</p>
                  <Link href="/products">
                    <Button className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm" size="sm">
                      Browse Products
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {orders.map(order => {
                    const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.placed;
                    const StatusIcon = statusConf.icon;
                    return (
                      <Link
                        key={order.id}
                        href={`/account/orders/${order.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <StatusIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{order.order_number}</p>
                            <span className={cn('status-badge text-[10px] px-2 py-0.5', statusConf.color)}>
                              {statusConf.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[hsl(var(--primary))]">${order.total_amount.toFixed(2)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profile info card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Personal Information</h3>
                <Link href="/account/settings">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-[hsl(var(--primary))] h-8 text-xs">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                  <p className="font-medium">{displayName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="font-medium">{profile?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                  <p className="font-medium">{new Date(user.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
