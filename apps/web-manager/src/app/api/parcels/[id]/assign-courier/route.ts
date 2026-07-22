import { assignCourierSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = assignCourierSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const { id } = await params;

  try {
    const { deliveries } = createRepositories();
    const delivery = await deliveries.assign(auth.session.ctx, id, body.data.courierId);

    return NextResponse.json(
      ok({
        delivery: {
          id: delivery.id,
          status: delivery.status,
          courierId: delivery.courierId,
          parcelId: delivery.parcelId,
          createdAt: delivery.createdAt.toISOString(),
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('déjà') || message.includes('doit') ? 400 : 500;
    return NextResponse.json(fail(message), { status });
  }
}
