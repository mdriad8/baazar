'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Chrome as Home, ShoppingBag, Grid3x3 as Grid3X3, ShoppingCart, User } from 'lucide-react';
import { useCart } from '@/lib/cart/context';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/products', icon: ShoppingBag, label: 'Products' },
  { href: '/categories', icon: Grid3X3, label: 'Categories' },
  { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: true },
  { href: '/account', icon: User, label: 'Account' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-16">
        {TABS.map(tab => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative',
                isActive ? 'text-[hsl(var(--primary))]' : 'text-gray-500'
              )}
            >
              <div className="relative">
                <tab.icon className={cn('w-5 h-5 transition-all', isActive && 'scale-110')} />
                {tab.badge && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[hsl(var(--primary))] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[hsl(var(--primary))] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
