import { createParcelSchema, fail, listParcelsQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toParcelDto } from '@/lib/parcel-presenter';
import { requireBusinessSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireBusinessSession();
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
    const items = await parcels.listForBusiness(
      auth.session.ctx,
      auth.session.profile.businessId!,
      query.data.status ? { status: query.data.status } : undefined,
    );

    return NextResponse.json(ok({ parcels: items.map(toParcelDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBusinessSession();
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
    const { parcels } = createRepositories();
    const parcel = await parcels.create(auth.session.ctx, {
      businessId: auth.session.profile.businessId!,
      reference: body.data.reference,
      recipientPhone: body.data.recipientPhone,
      recipientName: body.data.recipientName,
      lockerId: body.data.lockerId,
    });

    return NextResponse.json(ok({ parcel: toParcelDto(parcel) }), { status: 201 });
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err && err.code === 'P2002') {
      return NextResponse.json(fail('Cette référence existe déjà'), { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('cannot submit parcels') ? 403 : 500;
    const friendly = message.includes('cannot submit parcels')
      ? 'Votre compte entreprise n\'est pas encore actif. Contactez Eveider ou exécutez : UPDATE businesses SET status = \'active\';'
      : message;
    return NextResponse.json(fail(friendly), { status });
  }
}
