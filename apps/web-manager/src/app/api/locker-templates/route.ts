import { createLockerLayoutTemplateSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { listLockerLayoutTemplates } from '@/server/locker-settings';

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const templates = await listLockerLayoutTemplates(auth.session.ctx);
    return NextResponse.json(ok({ templates }));
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

  const body = createLockerLayoutTemplateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { lockerSettings } = createRepositories();
    const created = await lockerSettings.createTemplate(auth.session.ctx, {
      name: body.data.name,
      description: body.data.description ?? null,
      rows: body.data.rows,
      columns: body.data.columns,
      cells: body.data.cells,
    });
    return NextResponse.json(
      ok({
        template: {
          id: created.id,
          name: created.name,
          description: created.description,
          rows: created.rows,
          columns: created.columns,
          cells: created.cells,
          isStarter: created.isStarter,
          capacity: created.cells.length,
          updatedAt: created.updatedAt.toISOString(),
        },
      }),
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('existe déjà') ? 409 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
