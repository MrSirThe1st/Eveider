import { parcelImportErrorReportSchema } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { buildParcelImportErrorReportWorkbook } from '@/lib/export/parcel-import';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireBusinessSession } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = parcelImportErrorReportSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ success: false, error: 'Rapport invalide' }, { status: 400 });
  }

  const workbook = await buildParcelImportErrorReportWorkbook(body.data.rows);
  return xlsxResponse(workbook, stampFilename('rapport-erreurs-import'));
}
