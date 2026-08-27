import { fail, ok, guestTrackLookupSchema } from '@eveider/api-contracts';
import { createGuestTrackToken, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';
import { withMobileCors } from '@/lib/mobile-session';

function json(body: unknown, init?: { status?: number }) {
  return withMobileCors(NextResponse.json(body, init));
}

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const body = guestTrackLookupSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return json(
      fail(body.error.errors[0]?.message ?? 'Données invalides'),
      { status: 400 },
    );
  }

  try {
    const { parcels } = createRepositories();

    if (body.data.mode === 'tracking') {
      const parcel = await parcels.findForGuestTrackingByNumber(body.data.trackingNumber);
      if (!parcel) {
        return json(fail('Colis introuvable. Vérifiez le numéro de suivi.'), {
          status: 404,
        });
      }
      const trackToken = createGuestTrackToken(parcel.id, parcel.recipientPhone);
      return json(
        ok({
          trackToken,
          parcel: await buildCustomerParcelDto(parcel),
        }),
      );
    }

    if (body.data.mode === 'phone') {
      const candidates = await parcels.listForGuestTrackingByPhone(body.data.phone);
      if (candidates.length === 0) {
        return json(fail('Aucun colis trouvé pour ce numéro.'), { status: 404 });
      }
      if (candidates.length === 1) {
        const parcel = await parcels.findByIdForGuestTracking(
          candidates[0]!.id,
          body.data.phone,
        );
        if (!parcel) {
          return json(fail('Colis introuvable.'), { status: 404 });
        }
        const trackToken = createGuestTrackToken(parcel.id, parcel.recipientPhone);
        return json(
          ok({
            trackToken,
            parcel: await buildCustomerParcelDto(parcel),
          }),
        );
      }

      return json(
        ok({
          candidates: candidates.map((candidate) => ({
            id: candidate.id,
            trackingNumber: candidate.trackingNumber,
            reference: candidate.reference,
            status: candidate.status,
            businessName: candidate.businessName,
            updatedAt: candidate.updatedAt.toISOString(),
          })),
        }),
      );
    }

    const parcel = await parcels.findForGuestTracking(body.data.reference, body.data.phone);
    if (!parcel) {
      return json(fail('Colis introuvable. Vérifiez la référence et le téléphone.'), {
        status: 404,
      });
    }

    const trackToken = createGuestTrackToken(parcel.id, parcel.recipientPhone);

    return json(
      ok({
        trackToken,
        parcel: await buildCustomerParcelDto(parcel),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return json(fail(message), { status: 500 });
  }
}
