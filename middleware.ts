import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const CUSTOMER_PROTECTED = ['/account', '/checkout'];
const AUTH_ROUTES = ['/auth/login', '/auth/register'];
const SELLER_PREFIX = '/seller-dashboard';
const SELLER_LOGIN = '/seller-dashboard/login';
const DRIVER_PREFIX = '/driver-dashboard';
const DRIVER_LOGIN = '/driver-dashboard/login';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin routes are guarded entirely by the useAdmin hook client-side.
  // Excluding them from middleware avoids a redirect loop caused by the
  // browser client session not being visible in cookies during client-side navigation.
  if (pathname.startsWith('/admin-baazar')) {
    return NextResponse.next();
  }

  // Wishlist is accessible to guests (shows sign-in prompt)
  if (pathname.startsWith('/account/wishlist')) return NextResponse.next();

  const isCustomerProtected = CUSTOMER_PROTECTED.some(p => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p));
  const isSellerRoute = pathname.startsWith(SELLER_PREFIX) && pathname !== SELLER_LOGIN;
  const isDriverRoute = pathname.startsWith(DRIVER_PREFIX) && pathname !== DRIVER_LOGIN;

  if (!isCustomerProtected && !isAuthRoute && !isSellerRoute && !isDriverRoute) {
    return NextResponse.next();
  }

  // Create a mutable response so Supabase can write refreshed session cookies
  let res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect logged-in users away from auth pages — honour any redirect param
  if (isAuthRoute && user) {
    const redirectTo = req.nextUrl.searchParams.get('redirect') ?? req.nextUrl.searchParams.get('next');
    const url = req.nextUrl.clone();
    if (redirectTo && redirectTo.startsWith('/')) {
      url.pathname = redirectTo;
    } else {
      url.pathname = '/account';
    }
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isCustomerProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isSellerRoute && !user) {
    const url = req.nextUrl.clone();
    url.pathname = SELLER_LOGIN;
    return NextResponse.redirect(url);
  }

  if (isDriverRoute && !user) {
    const url = req.nextUrl.clone();
    url.pathname = DRIVER_LOGIN;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    '/account/:path*',
    '/checkout/:path*',
    '/auth/:path*',
    '/seller-dashboard/:path*',
    '/driver-dashboard/:path*',
    '/admin-baazar/:path*',
  ],
};
