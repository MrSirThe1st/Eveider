import { listParcelsQuerySchema, parcelExportScopeSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { buildAdminParcelsExportWorkbook } from '@/lib/export/parcel-export';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const scope = parcelExportScopeSchema.safeParse(searchParams.get('scope') ?? 'filtered');
  const query = listParcelsQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  });

  if (!scope.success || !query.success) {
    return NextResponse.json({ success: false, error: 'Paramètres d’export invalides' }, { status: 400 });
  }

  try {
    const { parcels } = createRepositories();
    const items = await parcels.listAll(auth.session.ctx, {
      status: scope.data === 'filtered' ? query.data.status : undefined,
      search: scope.data === 'filtered' ? query.data.search : undefined,
    });

    const workbook = await buildAdminParcelsExportWorkbook(items);
    return xlsxResponse(workbook, stampFilename('colis-admin'));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
