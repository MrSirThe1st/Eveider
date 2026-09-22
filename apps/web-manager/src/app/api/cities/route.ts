import {
  createCitySchema,
  fail,
  listCitiesQuerySchema,
  ok,
} from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toCityDto } from '@/lib/city-presenter';
import { requireAdminSession } from '@/lib/session';
import { listCities } from '@/server/cities';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listCitiesQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    includeArchived: searchParams.get('includeArchived') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Paramètres invalides'), {
      status: 400,
    });
  }

  try {
    const cities = await listCities(auth.session.ctx, parsed.data);
    return NextResponse.json(ok({ cities }));
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

  const body = createCitySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { cities } = createRepositories();
    const city = await cities.create(auth.session.ctx, body.data);
    return NextResponse.json(ok({ city: toCityDto(city) }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('existe déjà') || message.includes('déjà dans le réseau')
        ? 409
        : message.includes('référentiel')
          ? 400
          : 500;
    return NextResponse.json(fail(message), { status });
  }
}
