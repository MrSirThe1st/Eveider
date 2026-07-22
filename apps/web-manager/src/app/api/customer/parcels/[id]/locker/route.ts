import { fail, ok, selectParcelLockerSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildCustomerParcelDto } from '@/lib/customer-parcel-response';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const { id } = await params;
  const body = selectParcelLockerSchema.safeParse(await request.json());
  if (!body.success) {
    return withMobileCors(
      NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.assignLockerByCustomer(
      auth.session.ctx,
      id,
      body.data.lockerId,
    );

    return withMobileCors(
      NextResponse.json(ok({ parcel: await buildCustomerParcelDto(parcel) })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable')
      ? 404
      : message.includes('déjà') || message.includes('stade') || message.includes('indisponible')
        ? 409
        : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
