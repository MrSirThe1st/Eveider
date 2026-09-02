import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toParcelDto } from '@/lib/business-parcel-presenter';
import { requireOrgApiKey } from '@/lib/org-api-session';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireOrgApiKey(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(fail('Identifiant manquant'), { status: 400 });
  }

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.findForBusinessByIdOrTracking(
      auth.session.ctx,
      auth.session.businessId,
      decodeURIComponent(id),
    );
    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }
    return NextResponse.json(ok({ parcel: toParcelDto(parcel) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
