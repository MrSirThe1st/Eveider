import { createParcelSchema, fail, listParcelsQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toParcelDto } from '@/lib/business-parcel-presenter';
import {
  createOrganisationParcel,
  organisationParcelCreateStatus,
} from '@/lib/create-organisation-parcel';
import { requireBusinessSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireBusinessSession(undefined, 'view_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listParcelsQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(fail('Filtre de statut invalide'), { status: 400 });
  }

  try {
    const { parcels } = createRepositories();
    const items = await parcels.listForBusiness(auth.session.ctx, auth.session.profile.businessId!, {
      status: query.data.status,
      search: query.data.search,
    });

    return NextResponse.json(ok({ parcels: items.map(toParcelDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createParcelSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const result = await createOrganisationParcel(
      auth.session.ctx,
      auth.session.profile.businessId!,
      body.data,
    );

    return NextResponse.json(
      ok({
        parcel: result.parcel,
        recipientStatus: result.recipientStatus,
        invite: result.invite,
      }),
      { status: 201 },
    );
  } catch (err) {
    const { status, message } = organisationParcelCreateStatus(err);
    return NextResponse.json(fail(message), { status });
  }
}
