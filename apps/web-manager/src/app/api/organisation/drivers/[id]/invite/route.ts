import { fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession(undefined, 'manage_couriers');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  try {
    const { accounts } = createRepositories();
    const dossier = await accounts.inviteApprovedDossier(auth.session.ctx, id);
    return NextResponse.json(ok({ id: dossier.id, status: dossier.status }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
