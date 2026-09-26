import { claimDeliverySchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toCourierDeliveryDto } from '@/lib/courier-delivery-presenter';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const body = claimDeliverySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return withMobileCors(
      NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  try {
    const { deliveries } = createRepositories();
    const delivery = await deliveries.claim(
      auth.session.ctx,
      body.data.parcelId,
      body.data.kind,
    );

    return withMobileCors(
      NextResponse.json(ok({ delivery: toCourierDeliveryDto(delivery) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('activée') ||
      message.includes('Disponible') ||
      message.includes('disponible') ||
      message.includes('approuvé') ||
      message.includes('stade') ||
      message.includes('casier') ||
      message.includes('marchand') ||
      message.includes('retour')
        ? 400
        : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
