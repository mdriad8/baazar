import Link from 'next/link';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Truck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer */}
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-white">Baazar</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Australia&apos;s premier South Asian grocery and B2B marketplace. Delivering fresh halal meat, authentic spices, and everything from back home to your doorstep.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                <span>Sydney, Melbourne, Brisbane, Perth</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                <span>1800 BAAZAR</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                <span>hello@baazar.com.au</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns: 2-col grid on mobile */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-white mb-4">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'All Products', href: '/products' },
                { label: 'Halal Meat', href: '/category/halal-meat' },
                { label: 'Seafood', href: '/category/seafood' },
                { label: 'Rice & Grains', href: '/category/rice-grains' },
                { label: 'Spices', href: '/category/spices-condiments' },
                { label: 'Deals & Offers', href: '/deals' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white hover:text-[hsl(var(--primary))] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-white mb-4">My Account</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Sign In', href: '/auth/login' },
                { label: 'Create Account', href: '/auth/register' },
                { label: 'My Orders', href: '/account/orders' },
                { label: 'Track Order', href: '/track-order' },
                { label: 'Wishlist', href: '/account/wishlist' },
                { label: 'Promo Codes', href: '/account/promos' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Business */}
          <div>
            <h3 className="font-semibold text-white mb-4">Business</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Sell on Baazar', href: '/sell-on-baazar' },
                { label: 'Seller Application', href: '/seller-apply' },
                { label: 'Seller Dashboard', href: '/seller-dashboard' },
                { label: 'Advertise', href: '/advertise' },
                { label: 'Help Center', href: '/help' },
                { label: 'Contact Us', href: '/contact' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link
                  href="/driver-dashboard/login"
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                  Driver Login
                </Link>
              </li>
            </ul>
          </div>

          </div>{/* end link columns grid */}
        </div>
      </div>

      {/* Payment methods */}
      <div className="border-t border-gray-800">
        <div className="container-page py-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="text-xs text-gray-500 w-full text-center md:w-auto md:text-left">Secure payments:</span>
              {['Visa', 'Mastercard', 'PayPal', 'Afterpay', 'Stripe'].map(p => (
                <span key={p} className="px-2.5 py-1 bg-gray-800 rounded text-xs font-medium text-gray-300">
                  {p}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
              <span>SSL Secured</span>
              <span className="mx-1">|</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
              <span>Halal Certified Sellers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="container-page py-4">
          <div className="flex flex-col items-center gap-3 text-xs text-gray-500 md:flex-row md:justify-between">
            <p className="text-center md:text-left">&copy; {new Date().getFullYear()} Baazar Pty Ltd. All rights reserved. ABN: XX XXX XXX XXX</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-gray-300 transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
