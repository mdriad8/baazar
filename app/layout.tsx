import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { CartProvider } from '@/lib/cart/context';
import { WishlistProvider } from '@/lib/wishlist/context';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Baazar - South Asian Grocery & Halal Marketplace Australia',
    template: '%s | Baazar',
  },
  description: "Australia's premier South Asian grocery and halal marketplace. Fresh halal meat, authentic spices, rice, seafood and more delivered to your door in Sydney, Melbourne, Brisbane and Perth.",
  keywords: ['halal grocery', 'south asian food', 'basmati rice', 'halal meat', 'spices', 'australia', 'online grocery'],
  authors: [{ name: 'Baazar Pty Ltd' }],
  creator: 'Baazar',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://baazar.com.au',
    siteName: 'Baazar',
    title: 'Baazar - South Asian Grocery & Halal Marketplace Australia',
    description: "Australia's premier South Asian grocery and halal marketplace.",
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Baazar Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Baazar - South Asian Grocery & Halal Marketplace',
    description: "Fresh halal meat, spices, rice and more delivered across Australia.",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://baazar.com.au'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-gray-50 font-sans">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
              <Toaster />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
