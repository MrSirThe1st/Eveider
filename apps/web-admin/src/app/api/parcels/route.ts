import { fail, listParcelsQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toAdminParcelDto } from '@/lib/parcel-presenter';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listParcelsQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(fail('Filtre de statut invalide'), { status: 400 });
  }

  try {
    const { parcels } = createRepositories();
    const items = await parcels.listAll(
      auth.session.ctx,
      query.data.status ? { status: query.data.status } : undefined,
    );

    return NextResponse.json(ok({ parcels: items.map(toAdminParcelDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
