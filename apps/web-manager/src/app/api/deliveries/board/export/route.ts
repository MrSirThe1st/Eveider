import { listDeliveriesQuerySchema, parcelExportScopeSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import {
  adminDeliveryToBoardExportItem,
  buildDeliveriesExportWorkbook,
  type BoardExportItem,
} from '@/lib/export/delivery-export';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireAdminSession } from '@/lib/session';

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
    const { deliveries } = createRepositories();
    const ctx = auth.session.ctx;
    let items: BoardExportItem[] = [];

    if (view === 'all' || view === 'active') {
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
