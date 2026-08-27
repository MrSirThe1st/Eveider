import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { loadBusinessTeam } from '@/server/team';

export async function GET() {
  const auth = await requireBusinessSession(undefined, 'manage_team');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const team = await loadBusinessTeam(auth.session.ctx, auth.session.profile.id);
    return NextResponse.json(ok(team));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
