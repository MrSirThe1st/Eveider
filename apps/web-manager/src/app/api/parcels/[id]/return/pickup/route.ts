import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { parcelReturns } = createRepositories();
    const updated = await parcelReturns.confirmBusinessPickup(auth.session.ctx, id);
    return NextResponse.json(ok({ return: { id: updated.id, status: updated.status } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('possible') ||
      message.includes('livraison') ||
      message.includes('introuvable')
        ? 400
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
