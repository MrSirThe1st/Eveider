import { fail, ok, updateParcelStatusSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toAdminParcelDto } from '@/lib/parcel-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateParcelStatusSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const { id } = await params;

  try {
    const { parcels } = createRepositories();
    const parcel = await parcels.updateStatus(auth.session.ctx, id, body.data.status);

    const full = await parcels.findById(auth.session.ctx, parcel.id);
    if (!full) {
      return NextResponse.json(fail('Colis introuvable'), { status: 404 });
    }

    return NextResponse.json(ok({ parcel: toAdminParcelDto(full) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('Invalid parcel transition') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
