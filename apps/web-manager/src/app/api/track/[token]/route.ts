import { fail, ok } from '@eveider/api-contracts';
import { createRepositories, verifyGuestTrackToken } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const session = verifyGuestTrackToken(decodeURIComponent(token));
  if (!session) {
    return NextResponse.json(fail('Session de suivi expirée. Recherchez à nouveau votre colis.'), {
      status: 401,
    });
  }

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.findByIdForGuestTracking(session.parcelId, session.phone);
    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ parcel: await buildCustomerParcelDto(parcel) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
