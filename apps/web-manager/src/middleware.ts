import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Pages anyone can open without an account (guest track, marketing, auth). */
const PUBLIC_PREFIXES = ['/connexion', '/inscription', '/suivi', '/invite'];

function isPublicPath(pathname: string) {
  return pathname === '/' || PUBLIC_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const STATIC_FILE = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public files must not go through the login redirect. next/image fetches
  // /landing/* as the source; a 307 to HTML makes the optimizer return 500.
  if (STATIC_FILE.test(pathname) || pathname.startsWith('/landing/')) {
    return NextResponse.next();
  }

  // APIs handle their own auth (cookies or Bearer). Never HTML-redirect them.
  if (
    pathname.startsWith('/api/') ||
    pathname === '/api/auth/session' ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/payments/pawapay/callback/') ||
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/api/invite/')
  ) {
    return NextResponse.next();
  }

  const isPublic = isPublicPath(pathname);
  const { supabaseResponse, user } = await updateSession(request);

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/connexion';
    // Drop leftover query params (e.g. ?ref=) from the protected URL.
    loginUrl.search = '';
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
