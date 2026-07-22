import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { invites } = createRepositories();
    const invite = await invites.resend(auth.session.ctx, id);

    return NextResponse.json(ok({ invite }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('introuvable') ? 404
      : message.includes('déjà') ? 409
      : 500;
    return NextResponse.json(fail(message), { status });
  }
}
