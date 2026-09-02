import { fail, ok, parcelImportConfirmSchema } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createParcelsFromImport } from '@/lib/export/parcel-import-service';
import { requireBusinessSession } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'create_parcels');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = parcelImportConfirmSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  if (!body.data.ignoreErrors && body.data.rows.length === 0) {
    return NextResponse.json(fail('Aucune ligne valide à importer'), { status: 400 });
  }

  try {
    const businessId = auth.session.profile.businessId!;
    const results = await createParcelsFromImport(auth.session.ctx, businessId, body.data.rows);
    const created = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);

    return NextResponse.json(
      ok({
        createdCount: created.length,
        failedCount: failed.length,
        results,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
