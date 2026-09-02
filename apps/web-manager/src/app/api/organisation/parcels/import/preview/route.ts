import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { parseParcelImportWorkbook } from '@/lib/export/parcel-import';
import { requireBusinessSession } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(fail('Fichier Excel requis'), { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json(fail('Seuls les fichiers .xlsx sont acceptés'), { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const preview = await parseParcelImportWorkbook(buffer);
    const validCount = preview.rows.filter((row) => row.valid).length;
    const invalidCount = preview.rows.length - validCount;

    return NextResponse.json(
      ok({
        totalRows: preview.totalRows,
        validCount,
        invalidCount,
        rows: preview.rows,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
