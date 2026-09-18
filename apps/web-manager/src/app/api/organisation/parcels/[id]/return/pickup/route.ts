import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireBusinessSession(undefined, 'manage_operations');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const { parcelReturns } = createRepositories();
    const current = await parcelReturns.findLatestForParcel(id);
    if (!current) return NextResponse.json(fail('Retour introuvable'), { status: 404 });
    if (current.businessId !== auth.session.profile.businessId) {
      return NextResponse.json(fail('Colis hors périmètre'), { status: 403 });
    }
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
