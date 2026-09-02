import {
  createServiceAreaSchema,
  fail,
  listServiceAreasQuerySchema,
  ok,
} from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toServiceAreaDto } from '@/lib/service-area-presenter';
import { requireAdminSession } from '@/lib/session';
import { listServiceAreas } from '@/server/service-areas';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listServiceAreasQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    includeArchived: searchParams.get('includeArchived') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Paramètres invalides'), {
      status: 400,
    });
  }

  try {
    const areas = await listServiceAreas(auth.session.ctx, parsed.data);
    return NextResponse.json(ok({ serviceAreas: areas }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createServiceAreaSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { serviceAreas } = createRepositories();
    const area = await serviceAreas.create(auth.session.ctx, body.data);
    return NextResponse.json(ok({ serviceArea: toServiceAreaDto(area) }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('duplicate') || message.includes('unique') ? 409 : 500;
    return NextResponse.json(
      fail(status === 409 ? 'Ce code de zone existe déjà' : message),
      { status },
    );
  }
}
