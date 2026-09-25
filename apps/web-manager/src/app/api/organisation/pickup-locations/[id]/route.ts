import { fail, ok, updatePickupLocationSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { toPickupLocationDto } from '@/lib/pickup-location-presenter';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireBusinessSession(undefined, 'settings');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const businessId = auth.session.profile.businessId;
  if (!businessId) {
    return NextResponse.json(fail('Compte entreprise requis'), { status: 403 });
  }

  const { id } = await context.params;
  const body = updatePickupLocationSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { businessOnboarding } = createRepositories();
    const location = await businessOnboarding.updatePickupLocation(businessId, id, body.data);
    return NextResponse.json(ok({ location: toPickupLocationDto(location) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(fail(message), { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    await businessOnboarding.deletePickupLocation(businessId, id);
    return NextResponse.json(ok({ id }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
