import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toCustomerParcelDto } from '@/lib/customer-parcel-presenter';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { id } = await params;

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.findByIdForCustomer(auth.session.ctx, id);

    if (!parcel) {
      return withMobileCors(
        NextResponse.json(fail('Colis introuvable'), { status: 404 }),
      );
    }

    return withMobileCors(
      NextResponse.json(ok({ parcel: toCustomerParcelDto(parcel) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('scope') ? 403 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
