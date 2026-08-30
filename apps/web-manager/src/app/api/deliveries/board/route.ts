import { fail, listDeliveriesQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { DELIVERY_STATUS_LABELS, PARCEL_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';
import { NextResponse } from 'next/server';
import { toAdminDeliveryDto } from '@/lib/admin-delivery-presenter';
import { toBusinessDto } from '@/lib/business-presenter';
import { toLockerSummaryDto } from '@/lib/locker-presenter';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';

function mapParcelBoardItem(
  item: Awaited<
    ReturnType<import('@eveider/data-access').ParcelRepository['listForAdminBoard']>
  >[number],
) {
  return {
    id: item.delivery?.id ?? item.parcelId,
    kind: item.delivery ? ('delivery' as const) : ('parcel' as const),
    status: item.delivery?.status ?? item.parcelStatus,
    statusLabel: item.delivery
      ? DELIVERY_STATUS_LABELS[item.delivery.status as DeliveryStatus]
      : PARCEL_STATUS_LABELS[item.parcelStatus],
    updatedAt: item.updatedAt.toISOString(),
    courier: item.delivery?.courier ?? null,
    parcel: {
      id: item.parcelId,
      trackingNumber: item.trackingNumber,
      reference: item.reference,
      status: item.parcelStatus,
      recipientName: item.recipientName,
      recipientPhone: item.recipientPhone,
      business: item.business,
      locker: item.locker,
      compartment: item.compartment,
    },
  };
}

const EMPTY_META = {
  couriers: [] as Array<{
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  }>,
  lockers: [] as ReturnType<typeof toLockerSummaryDto>[],
  businesses: [] as ReturnType<typeof toBusinessDto>[],
};

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/deliveries/board');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = listDeliveriesQuerySchema.safeParse({
    view: searchParams.get('view') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    courierId: searchParams.get('courierId') ?? undefined,
    lockerId: searchParams.get('lockerId') ?? undefined,
    businessId: searchParams.get('businessId') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    includeMeta: searchParams.get('includeMeta') ?? undefined,
  });

  if (!query.success) {
    perf.flush(400);
    return NextResponse.json(fail('Filtres invalides'), { status: 400 });
  }

  const view = query.data.view ?? 'active';
  const includeMeta = query.data.includeMeta;

  try {
    const { deliveries, parcels, users, lockers, businesses } = createRepositories();
    const ctx = auth.session.ctx;

    const meta = includeMeta
      ? await perf.measure('db.board.meta', async () => {
          const [courierItems, lockerItems, businessItems] = await Promise.all([
            users.listAssignableCouriers(),
            lockers.listAll(ctx),
            businesses.list(ctx),
          ]);
          return {
            couriers: courierItems.map((courier) => ({
              id: courier.id,
              fullName: courier.fullName,
              email: courier.email,
              phone: courier.phone,
            })),
            lockers: lockerItems.map(toLockerSummaryDto),
            businesses: businessItems.map(toBusinessDto),
          };
        })
      : EMPTY_META;

    if (view === 'au_casier') {
      const parcelItems = await parcels.listForAdminBoard(ctx, {
        parcelStatuses: ['delivered_to_locker', 'ready_for_pickup'],
        search: query.data.search,
      });
      perf.flush(200);
      return NextResponse.json(
        ok({
          view,
          items: parcelItems.map(mapParcelBoardItem),
          summary: null,
          ...meta,
        }),
      );
    }

    if (view === 'collected') {
      const parcelItems = await parcels.listForAdminBoard(ctx, {
        parcelStatuses: ['collected'],
        search: query.data.search,
      });
      perf.flush(200);
      return NextResponse.json(
        ok({
          view,
          items: parcelItems.map(mapParcelBoardItem),
          summary: null,
          ...meta,
        }),
      );
    }

    const listFilters = {
      status: query.data.status,
      courierId: query.data.courierId,
      lockerId: query.data.lockerId,
      businessId: query.data.businessId,
      search: query.data.search,
      includeAllStatuses: view === 'all',
    };

    const [deliveryItems, summary] = await perf.measure('db.board.rows', () =>
      Promise.all([
        deliveries.listForAdmin(ctx, listFilters),
        view === 'active' ? deliveries.getActiveSummary(ctx) : Promise.resolve(null),
      ]),
    );

    perf.flush(200);
    return NextResponse.json(
      ok({
        view,
        items: deliveryItems.map((delivery) => {
          const dto = toAdminDeliveryDto(delivery);
          return {
            id: dto.id,
            kind: 'delivery' as const,
            status: dto.status,
            statusLabel: dto.statusLabel,
            updatedAt: dto.updatedAt,
            courier: dto.courier,
            parcel: dto.parcel,
          };
        }),
        summary,
        ...meta,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}
