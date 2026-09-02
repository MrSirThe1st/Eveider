import { businessParcelExportQuerySchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import {
  buildBusinessParcelsExportWorkbook,
  parcelMatchesBusinessLocation,
} from '@/lib/export/parcel-export';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireBusinessSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireBusinessSession(undefined, 'view_parcels');
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = businessParcelExportQuerySchema.safeParse({
    scope: searchParams.get('scope') ?? undefined,
    location: searchParams.get('location') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json({ success: false, error: 'Paramètres d’export invalides' }, { status: 400 });
  }

  try {
    const businessId = auth.session.profile.businessId!;
    const { parcels } = createRepositories();
    const [fullParcels, colisMeta] = await Promise.all([
      parcels.listForBusiness(auth.session.ctx, businessId, {
        search: query.data.scope === 'filtered' ? query.data.search : undefined,
      }),
      parcels.listBusinessColis(auth.session.ctx, businessId),
    ]);

    const metaById = new Map(colisMeta.map((row) => [row.id, row]));
    let rows = fullParcels.map((parcel) => ({
      parcel,
      latestDeliveryStatus: metaById.get(parcel.id)?.latestDeliveryStatus ?? null,
      latestDeliveryKind: metaById.get(parcel.id)?.latestDeliveryKind ?? null,
    }));

    if (query.data.scope === 'filtered' && query.data.location) {
      rows = rows.filter(({ parcel, latestDeliveryStatus, latestDeliveryKind }) =>
        parcelMatchesBusinessLocation(
          parcel,
          latestDeliveryStatus,
          query.data.location!,
          latestDeliveryKind,
        ),
      );
    }

    const workbook = await buildBusinessParcelsExportWorkbook(rows);
    return xlsxResponse(workbook, stampFilename('colis'));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
