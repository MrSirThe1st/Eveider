import { listDeliveriesQuerySchema, parcelExportScopeSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { DELIVERY_STATUS_LABELS, PARCEL_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';
import { NextResponse } from 'next/server';
import {
  adminDeliveryToBoardExportItem,
  buildDeliveriesExportWorkbook,
  type BoardExportItem,
} from '@/lib/export/delivery-export';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireAdminSession } from '@/lib/session';

function mapParcelBoardItem(
  item: Awaited<
    ReturnType<import('@eveider/data-access').ParcelRepository['listForAdminBoard']>
  >[number],
): BoardExportItem {
  return {
    id: item.delivery?.id ?? item.parcelId,
    kind: item.delivery ? 'delivery' : 'parcel',
    status: item.delivery?.status ?? item.parcelStatus,
    statusLabel: item.delivery
      ? DELIVERY_STATUS_LABELS[item.delivery.status as DeliveryStatus]
      : PARCEL_STATUS_LABELS[item.parcelStatus],
    updatedAt: item.updatedAt.toISOString(),
    courier: item.delivery?.courier ?? null,
    parcel: {
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

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const scope = parcelExportScopeSchema.safeParse(searchParams.get('scope') ?? 'filtered');
  const query = listDeliveriesQuerySchema.safeParse({
    view: searchParams.get('view') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    courierId: searchParams.get('courierId') ?? undefined,
    lockerId: searchParams.get('lockerId') ?? undefined,
    businessId: searchParams.get('businessId') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!scope.success || !query.success) {
    return NextResponse.json({ success: false, error: 'Paramètres d’export invalides' }, { status: 400 });
  }

  const view = scope.data === 'all' ? 'all' : (query.data.view ?? 'active');

  try {
    const { deliveries, parcels } = createRepositories();
    const ctx = auth.session.ctx;
    let items: BoardExportItem[] = [];

    if (view === 'au_casier') {
      const parcelItems = await parcels.listForAdminBoard(ctx, {
        parcelStatuses: ['delivered_to_locker', 'ready_for_pickup'],
        search: scope.data === 'filtered' ? query.data.search : undefined,
      });
      items = parcelItems.map(mapParcelBoardItem);
    } else if (view === 'collected') {
      const parcelItems = await parcels.listForAdminBoard(ctx, {
        parcelStatuses: ['collected'],
        search: scope.data === 'filtered' ? query.data.search : undefined,
      });
      items = parcelItems.map(mapParcelBoardItem);
    } else {
      const deliveryItems = await deliveries.listForAdmin(ctx, {
        status: scope.data === 'filtered' ? query.data.status : undefined,
        courierId: scope.data === 'filtered' ? query.data.courierId : undefined,
        lockerId: scope.data === 'filtered' ? query.data.lockerId : undefined,
        businessId: scope.data === 'filtered' ? query.data.businessId : undefined,
        search: scope.data === 'filtered' ? query.data.search : undefined,
        includeAllStatuses: view === 'all',
      });
      items = deliveryItems.map(adminDeliveryToBoardExportItem);
    }

    const workbook = await buildDeliveriesExportWorkbook(items);
    return xlsxResponse(workbook, stampFilename('livraisons'));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
