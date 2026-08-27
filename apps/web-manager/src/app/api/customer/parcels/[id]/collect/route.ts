import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { id } = await params;

  try {
    const { parcels, payments } = createRepositories();
    const existing = await parcels.findByIdForCustomer(auth.session.ctx, id);
    if (!existing) {
      return withMobileCors(NextResponse.json(fail('Colis introuvable'), { status: 404 }));
    }

    const paid = await payments.hasCompletedPickupPayment(id);
    if (!paid) {
      return withMobileCors(
        NextResponse.json(fail('Paiement requis avant le retrait'), { status: 409 }),
      );
    }

    const parcel = await parcels.markCollectedByCustomer(auth.session.ctx, id);

    return withMobileCors(
      NextResponse.json(ok({ parcel: await buildCustomerParcelDto(parcel) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable')
      ? 404
      : message.includes('périmètre')
        ? 403
        : message.includes('prêt')
          ? 409
          : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
