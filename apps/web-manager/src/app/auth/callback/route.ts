import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { getLandingPathForUser } from '@/lib/auth-routing';
import {
  invalidateCurrentUserCache,
  resolveCurrentUser,
} from '@/lib/auth/resolve-current-user';
import { createClient } from '@/lib/supabase/server';

function isSafeAuthNext(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  return (
    path.startsWith('/reinitialiser-mot-de-passe') ||
    path.startsWith('/connexion') ||
    path.startsWith('/tableau-de-bord') ||
    path.startsWith('/organisation/')
  );
}

async function syncProfileEmail(authId: string, email: string | undefined) {
  const trimmed = email?.trim();
  if (!trimmed) return;

  const { users } = createRepositories();
  const profile = await users.findByAuthId(authId);
  if (!profile) return;
  if (profile.email?.toLowerCase() === trimmed.toLowerCase()) return;

  await users.updateProfile(profile.id, { email: trimmed });
  invalidateCurrentUserCache(authId);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const safeNext = nextParam && isSafeAuthNext(nextParam) ? nextParam : null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await syncProfileEmail(data.user.id, data.user.email);

      if (safeNext) {
        return NextResponse.redirect(new URL(safeNext, origin));
      }

      const current = await resolveCurrentUser();
      const landing = current ? getLandingPathForUser(current) : null;
      return NextResponse.redirect(new URL(landing ?? '/connexion', origin));
    }
  }

  const login = new URL('/connexion', origin);
  login.searchParams.set('error', 'lien_invalide');
  return NextResponse.redirect(login);
}
