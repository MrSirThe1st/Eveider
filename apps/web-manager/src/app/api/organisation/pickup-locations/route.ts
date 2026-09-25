import { fail, ok, upsertPickupLocationSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { toPickupLocationDto } from '@/lib/pickup-location-presenter';

export async function GET() {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const businessId = auth.session.profile.businessId;
  if (!businessId) {
    return NextResponse.json(fail('Compte entreprise requis'), { status: 403 });
  }

  try {
    const { businessOnboarding } = createRepositories();
    const locations = await businessOnboarding.listPickupLocations(businessId);
    return NextResponse.json(ok({ locations: locations.map(toPickupLocationDto) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const businessId = auth.session.profile.businessId;
  if (!businessId) {
    return NextResponse.json(fail('Compte entreprise requis'), { status: 403 });
  }

  const body = upsertPickupLocationSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { businessOnboarding } = createRepositories();
    const location = await businessOnboarding.createPickupLocation(businessId, body.data);
    return NextResponse.json(ok({ location: toPickupLocationDto(location) }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
