import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Pages anyone can open without an account (guest track, marketing, auth). */
const PUBLIC_PREFIXES = ['/connexion', '/inscription', '/suivi', '/invite'];

function isPublicPath(pathname: string) {
  return pathname === '/' || PUBLIC_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
