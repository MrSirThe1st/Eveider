import { fail, ok, updateParcelDueAtSchema } from '@eveider/api-contracts';
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

  const body = updateParcelDueAtSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const { id } = await params;

  try {
    const { parcels } = createRepositories();
    const dueAt = body.data.dueAt == null ? null : new Date(body.data.dueAt);
    const parcel = await parcels.updateDueAt(auth.session.ctx, id, dueAt);

    return NextResponse.json(ok({ parcel: toAdminParcelDto(parcel) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('not found') || message.includes('introuvable')
        ? 404
        : message.includes('Échéance')
          ? 400
          : message.includes('scope') || message.includes('Access')
            ? 403
            : 500;
    return NextResponse.json(fail(message), { status });
  }
}
