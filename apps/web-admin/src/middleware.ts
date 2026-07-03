import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PREFIXES = ['/connexion', '/inscription'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === '/' || PUBLIC_PREFIXES.some((path) => pathname.startsWith(path));

  // Session ping uses getSession only — skip middleware refresh to avoid double-rotation.
  if (pathname === '/api/auth/session') {
    return NextResponse.next();
  }

  const { supabaseResponse, user, authCheckFailed } = await updateSession(request);

  // Only redirect when auth explicitly returned no user — not on transient network errors.
  if (user === null && !authCheckFailed && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/connexion';
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
