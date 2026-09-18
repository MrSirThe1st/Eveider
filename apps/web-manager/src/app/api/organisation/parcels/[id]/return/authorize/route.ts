import { authorizeParcelReturnSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireBusinessSession(undefined, 'manage_operations');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  const body = authorizeParcelReturnSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { parcelReturns } = createRepositories();
    const current = await parcelReturns.findLatestForParcel(id);
    if (!current) return NextResponse.json(fail('Retour introuvable'), { status: 404 });
    if (current.businessId !== auth.session.profile.businessId) {
      return NextResponse.json(fail('Colis hors périmètre'), { status: 403 });
    }
    const updated = await parcelReturns.authorize(auth.session.ctx, current.id, body.data);
    return NextResponse.json(ok({ return: { id: updated.id, status: updated.status } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('attente') ||
      message.includes('éligibles') ||
      message.includes('indisponible') ||
      message.includes('introuvable')
        ? 400
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
