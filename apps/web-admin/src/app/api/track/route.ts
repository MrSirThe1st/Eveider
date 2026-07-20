import { fail, ok, guestTrackLookupSchema } from '@eveider/api-contracts';
import { createGuestTrackToken, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';

export async function POST(request: Request) {
  const body = guestTrackLookupSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      fail(body.error.errors[0]?.message ?? 'Données invalides'),
      { status: 400 },
    );
  }

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.findForGuestTracking(body.data.reference, body.data.phone);
    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable. Vérifiez la référence et le téléphone.'), {
        status: 404,
      });
    }

    const trackToken = createGuestTrackToken(parcel.id, parcel.recipientPhone);

    return NextResponse.json(
      ok({
        trackToken,
        parcel: await buildCustomerParcelDto(parcel),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
