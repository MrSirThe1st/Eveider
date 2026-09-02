import { NextResponse } from 'next/server';
import { buildParcelImportTemplateWorkbook } from '@/lib/export/parcel-import';
import { stampFilename, xlsxResponse } from '@/lib/export/xlsx-utils';
import { requireBusinessSession } from '@/lib/session';

export async function GET() {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const workbook = await buildParcelImportTemplateWorkbook();
  return xlsxResponse(workbook, stampFilename('modele-import-colis'));
}
