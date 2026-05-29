'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingBag, Users, Store, Megaphone, DollarSign, Tag, ChartBar as BarChart3, Settings, Bell, Shield, Truck, UserCheck, FileText, CircleCheck as CheckCircle2, Layers, RefreshCcw, Star, Image as ImageIcon, Menu, X, Headphones, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin-baazar' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, href: '/admin-baazar/orders', badge: 'new' },
  { id: 'products', label: 'Products', icon: Package, href: '/admin-baazar/products' },
  { id: 'product-approvals', label: 'Product Approvals', icon: CheckCircle2, href: '/admin-baazar/product-approvals', badge: 'pending' },
  { id: 'categories', label: 'Categories', icon: Layers, href: '/admin-baazar/categories' },
  { id: 'customers', label: 'Customers', icon: Users, href: '/admin-baazar/customers' },
  { id: 'sellers', label: 'Sellers / B2B', icon: Store, href: '/admin-baazar/sellers' },
  { id: 'seller-apps', label: 'Seller Applications', icon: FileText, href: '/admin-baazar/seller-applications', badge: 'pending' },
  { id: 'ads', label: 'Ads & Campaigns', icon: Megaphone, href: '/admin-baazar/ads', badge: 'pending' },
  { id: 'payments', label: 'Payments', icon: DollarSign, href: '/admin-baazar/payments' },
  { id: 'refunds', label: 'Refunds', icon: RefreshCcw, href: '/admin-baazar/refunds', badge: 'pending' },
  { id: 'promos', label: 'Promo Codes', icon: Tag, href: '/admin-baazar/promos' },
  { id: 'banners', label: 'Homepage Banners', icon: ImageIcon, href: '/admin-baazar/banners' },
  { id: 'delivery', label: 'Delivery', icon: Truck, href: '/admin-baazar/delivery' },
  { id: 'drivers', label: 'Delivery Drivers', icon: UserCheck, href: '/admin-baazar/drivers' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/admin-baazar/analytics' },
  { id: 'reviews', label: 'Reviews', icon: Star, href: '/admin-baazar/reviews' },
  { id: 'support', label: 'Support Tickets', icon: Headphones, href: '/admin-baazar/support', badge: 'open' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/admin-baazar/notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/admin-baazar/settings' },
];

function SidebarContent({ user, pathname, onClose, onSignOut }: { user: { email?: string } | null; pathname: string; onClose?: () => void; onSignOut: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm">Baazar</div>
              <div className="text-gray-400 text-[10px]">Admin Panel</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <div className="p-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2.5 p-2.5 bg-gray-800 rounded-xl">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Admin</p>
            <p className="text-gray-400 text-[10px] truncate">{user?.email}</p>
          </div>
          <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        </div>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/admin-baazar' && pathname.startsWith(item.href));
          return (
            <Link key={item.id} href={item.href} onClick={onClose}
              className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                active ? 'bg-emerald-600 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {(item.badge === 'pending' || item.badge === 'open') && <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" />}
              {item.badge === 'new' && <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-800 flex-shrink-0 space-y-1">
        <a href="/" className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white text-xs rounded-lg hover:bg-gray-800 transition-all">
          <span>← Back to Baazar Shop</span>
        </a>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 text-xs rounded-lg hover:bg-gray-800 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminBaazarShell({ children, title, subtitle, headerRight }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.replace('/admin-baazar/login');
  };

  return (
    <>
      {/* Mobile sidebar overlay — rendered at root level so nothing clips it */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gray-900 flex flex-col overflow-hidden shadow-2xl">
            <SidebarContent user={user} pathname={pathname} onClose={() => setMobileOpen(false)} onSignOut={handleSignOut} />
          </aside>
        </div>
      )}

      <div className="bg-gray-50 min-h-screen flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 bg-gray-900 flex-shrink-0 sticky top-0 h-screen overflow-hidden">
          <SidebarContent user={user} pathname={pathname} onSignOut={handleSignOut} />
        </aside>

        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-30">
            {/* Hamburger — visible on all screens below lg */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
            </div>
            {headerRight && <div className="flex items-center gap-2 flex-shrink-0">{headerRight}</div>}
          </div>

          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
