import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { loadBusinessParcelDetail } from '@/server/parcels';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const businessId = auth.session.profile.businessId;
  if (!businessId) {
    return NextResponse.json(fail('Compte entreprise requis'), { status: 403 });
  }

  try {
    const parcel = await loadBusinessParcelDetail(auth.session.ctx, businessId, id);

    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ parcel }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 403 });
  }
}
