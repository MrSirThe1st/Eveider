import { fail, ok, updateLockerLayoutTemplateSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { getLockerLayoutTemplate } from '@/server/locker-settings';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const template = await getLockerLayoutTemplate(auth.session.ctx, id);
    if (!template) {
      return NextResponse.json(fail('Modèle introuvable'), { status: 404 });
    }
    return NextResponse.json(ok({ template }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  const body = updateLockerLayoutTemplateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockerSettings } = createRepositories();
    const updated = await lockerSettings.updateTemplate(auth.session.ctx, id, body.data);
    return NextResponse.json(
      ok({
        template: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          rows: updated.rows,
          columns: updated.columns,
          cells: updated.cells,
          isStarter: updated.isStarter,
          capacity: updated.cells.length,
          updatedAt: updated.updatedAt.toISOString(),
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable')
      ? 404
      : message.includes('existe déjà')
        ? 409
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const { lockerSettings } = createRepositories();
    await lockerSettings.archiveTemplate(auth.session.ctx, id);
    return NextResponse.json(ok({ archived: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable')
      ? 404
      : message.includes('démarrage')
        ? 400
        : 500;
    return NextResponse.json(fail(message), { status });
  }
}
