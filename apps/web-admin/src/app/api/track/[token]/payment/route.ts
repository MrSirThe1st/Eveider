import { fail, ok, initiatePickupPaymentSchema } from '@eveider/api-contracts';
import { createRepositories, verifyGuestTrackToken } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';

type RouteParams = { params: Promise<{ token: string }> };

function resolveSession(token: string) {
  return verifyGuestTrackToken(decodeURIComponent(token));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const session = resolveSession(token);
  if (!session) {
    return NextResponse.json(fail('Session de suivi expirée. Recherchez à nouveau votre colis.'), {
      status: 401,
    });
  }

  try {
    const { parcels, payments } = createRepositories();
    const parcel = await parcels.findByIdForGuestTracking(session.parcelId, session.phone);
    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    const payment = await payments.refreshGuestPickupPayment(session.parcelId, session.phone);

    return NextResponse.json(
      ok({
        payment,
        parcel: await buildCustomerParcelDto(parcel),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(fail(message), { status });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;
  const session = resolveSession(token);
  if (!session) {
    return NextResponse.json(fail('Session de suivi expirée. Recherchez à nouveau votre colis.'), {
      status: 401,
    });
  }

  const body = initiatePickupPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      fail(body.error.errors[0]?.message ?? 'Données invalides'),
      { status: 400 },
    );
  }

  try {
    const { parcels, payments } = createRepositories();
    const result = await payments.initiateGuestPickupPayment(
      session.parcelId,
      session.phone,
      body.data,
    );
    const parcel = await parcels.findByIdForGuestTracking(session.parcelId, session.phone);
    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    return NextResponse.json(
      ok({
        pawapayStatus: result.pawapayStatus,
        payment: await payments.getPickupPaymentSummary(session.parcelId),
        parcel: await buildCustomerParcelDto(parcel),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable')
      ? 404
      : message.includes('déjà') || message.includes('disponible')
        ? 409
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
