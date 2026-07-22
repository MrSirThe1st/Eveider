import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toAdminParcelDto } from '@/lib/parcel-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { parcels, deliveries } = createRepositories();
    const parcel = await parcels.findById(auth.session.ctx, id);

    if (!parcel) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    const activeDelivery = await deliveries.findActiveForParcel(auth.session.ctx, id);

    return NextResponse.json(
      ok({
        parcel: toAdminParcelDto(parcel),
        activeDelivery: activeDelivery
          ? {
              id: activeDelivery.id,
              status: activeDelivery.status,
              courier: activeDelivery.courier,
              createdAt: activeDelivery.createdAt.toISOString(),
            }
          : null,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('scope') || message.includes('Access') ? 403 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
