import { confirmPickupSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toCourierDeliveryDto } from '@/lib/courier-delivery-presenter';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const body = confirmPickupSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return withMobileCors(
      NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  const { id } = await params;

  try {
    const { deliveries } = createRepositories();
    const input =
      body.data.mode === 'scan'
        ? ({ mode: 'scan', code: body.data.reference } as const)
        : ({ mode: 'manual' } as const);
    const delivery = await deliveries.confirmPickup(auth.session.ctx, id, input);

    return withMobileCors(
      NextResponse.json(ok({ delivery: toCourierDeliveryDto(delivery) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('incorrecte') ||
      message.includes('démarrage') ||
      message.includes('attente')
        ? 400
        : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
