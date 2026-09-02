import { fail, ok, updateServiceAreaSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toServiceAreaDto } from '@/lib/service-area-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { serviceAreas } = createRepositories();
    const area = await serviceAreas.findById(auth.session.ctx, id);
    if (!area) {
      return NextResponse.json(fail('Zone de service introuvable'), { status: 404 });
    }
    return NextResponse.json(ok({ serviceArea: toServiceAreaDto(area) }));
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
  const body = updateServiceAreaSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { serviceAreas } = createRepositories();
    const area = await serviceAreas.update(auth.session.ctx, id, body.data);
    return NextResponse.json(ok({ serviceArea: toServiceAreaDto(area) }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('introuvable') ? 404 : message.includes('duplicate') || message.includes('unique') ? 409 : 500;
    return NextResponse.json(
      fail(status === 409 ? 'Ce code de zone existe déjà' : message),
      { status },
    );
  }
}
