import { assignCourierSchema, fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession(undefined, 'manage_couriers');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = assignCourierSchema.safeParse(await request.json().catch(() => null));
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
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : message.includes('déjà') ? 400 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
