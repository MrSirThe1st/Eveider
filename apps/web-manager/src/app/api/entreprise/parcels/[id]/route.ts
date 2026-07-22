import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toParcelDto } from '@/lib/business-parcel-presenter';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.findById(auth.session.ctx, id);

    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ parcel: toParcelDto(parcel) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 403 });
  }
}
