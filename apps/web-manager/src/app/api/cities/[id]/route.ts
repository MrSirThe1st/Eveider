import { fail, ok, updateCitySchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toCityDto } from '@/lib/city-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  try {
    const { cities } = createRepositories();
    const city = await cities.findById(id);
    if (!city) {
      return NextResponse.json(fail('Ville introuvable'), { status: 404 });
    }
    return NextResponse.json(ok({ city: toCityDto(city) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const body = updateCitySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { cities } = createRepositories();
    const city = await cities.update(auth.session.ctx, id, body.data);
    return NextResponse.json(ok({ city: toCityDto(city) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable')
      ? 404
      : message.includes('archiver') || message.includes('existe déjà')
        ? 409
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
