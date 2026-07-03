import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PREFIXES = ['/connexion', '/inscription'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === '/' || PUBLIC_PREFIXES.some((path) => pathname.startsWith(path));
  const isApi = pathname.startsWith('/api');

  const { supabaseResponse, user } = await updateSession(request);

  if (!user && !isPublic && !isApi) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/connexion';
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
