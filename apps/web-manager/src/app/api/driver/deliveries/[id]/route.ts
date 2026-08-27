import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toCourierDeliveryDto } from '@/lib/courier-delivery-presenter';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { id } = await params;

  try {
    const { deliveries } = createRepositories();
    const delivery = await deliveries.findByIdForCourier(auth.session.ctx, id);

    if (!delivery) {
      return withMobileCors(
        NextResponse.json(fail('Livraison introuvable'), { status: 404 }),
      );
    }

    return withMobileCors(
      NextResponse.json(ok({ delivery: toCourierDeliveryDto(delivery) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('scope') || message.includes('périmètre') ? 403 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
