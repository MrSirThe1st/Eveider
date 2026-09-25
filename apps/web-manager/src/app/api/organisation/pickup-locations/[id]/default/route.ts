import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { toPickupLocationDto } from '@/lib/pickup-location-presenter';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const businessId = auth.session.profile.businessId;
  if (!businessId) {
    return NextResponse.json(fail('Compte entreprise requis'), { status: 403 });
  }

  const { id } = await context.params;

  try {
    const { businessOnboarding } = createRepositories();
    const location = await businessOnboarding.setDefaultPickupLocation(businessId, id);
    return NextResponse.json(ok({ location: toPickupLocationDto(location) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
