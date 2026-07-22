import { fail, listDeliveriesQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toAdminDeliveryDto } from '@/lib/admin-delivery-presenter';
import { toBusinessDto } from '@/lib/business-presenter';
import { toLockerSummaryDto } from '@/lib/locker-presenter';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';

/**
 * Livraisons screen bundle — one auth check, parallel DB reads.
 * Returns deliveries + filter dropdown data in a single round trip.
 */
export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/deliveries/board');
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
    const { deliveries, users, lockers, businesses } = createRepositories();
    const ctx = auth.session.ctx;

    const [deliveryItems, summary, courierItems, lockerItems, businessItems] = await perf.measure(
      'db.board',
      () =>
        Promise.all([
          deliveries.listForAdmin(ctx, query.data),
          deliveries.getActiveSummary(ctx),
          users.listByRole('courier'),
          lockers.listAll(ctx),
          businesses.list(ctx),
        ]),
    );

    perf.flush(200);
    return NextResponse.json(
      ok({
        deliveries: deliveryItems.map(toAdminDeliveryDto),
        summary,
        couriers: courierItems.map((courier) => ({
          id: courier.id,
          fullName: courier.fullName,
          email: courier.email,
          phone: courier.phone,
        })),
        lockers: lockerItems.map(toLockerSummaryDto),
        businesses: businessItems.map(toBusinessDto),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
