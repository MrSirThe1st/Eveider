import { fail, ok, initiatePickupPaymentSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';
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
    const { parcels, payments } = createRepositories();
    const parcel = await parcels.findByIdForCustomer(auth.session.ctx, id);
    if (!parcel) {
      return withMobileCors(NextResponse.json(fail('Colis introuvable'), { status: 404 }));
    }

    const payment = await payments.refreshPickupPayment(auth.session.ctx, id);

    return withMobileCors(
      NextResponse.json(
        ok({
          payment,
          parcel: await buildCustomerParcelDto(parcel),
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('périmètre') ? 403 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { id } = await params;
  const body = initiatePickupPaymentSchema.safeParse(await request.json());
  if (!body.success) {
    return withMobileCors(
      NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  try {
    const { parcels, payments } = createRepositories();
    const result = await payments.initiatePickupPayment(auth.session.ctx, id, body.data);
    const parcel = await parcels.findByIdForCustomer(auth.session.ctx, id);
    if (!parcel) {
      return withMobileCors(NextResponse.json(fail('Colis introuvable'), { status: 404 }));
    }

    return withMobileCors(
      NextResponse.json(
        ok({
          pawapayStatus: result.pawapayStatus,
          payment: await payments.getPickupPaymentSummary(id),
          parcel: await buildCustomerParcelDto(parcel),
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('périmètre')
      ? 403
      : message.includes('introuvable')
        ? 404
        : message.includes('déjà') || message.includes('disponible')
          ? 409
          : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
