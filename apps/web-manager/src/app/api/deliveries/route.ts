import { fail, listDeliveriesQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toAdminDeliveryDto } from '@/lib/admin-delivery-presenter';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/deliveries');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listDeliveriesQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    courierId: searchParams.get('courierId') ?? undefined,
    lockerId: searchParams.get('lockerId') ?? undefined,
    businessId: searchParams.get('businessId') ?? undefined,
  });

  if (!query.success) {
    perf.flush(400);
    return NextResponse.json(fail('Filtres invalides'), { status: 400 });
  }

  try {
    const { deliveries } = createRepositories();
    const [deliveryItems, summary] = await perf.measure('db.deliveries', () =>
      Promise.all([
        deliveries.listForAdmin(auth.session.ctx, query.data),
        deliveries.getActiveSummary(auth.session.ctx),
      ]),
    );

    perf.flush(200);
    return NextResponse.json(
      ok({
        deliveries: deliveryItems.map(toAdminDeliveryDto),
        summary,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
