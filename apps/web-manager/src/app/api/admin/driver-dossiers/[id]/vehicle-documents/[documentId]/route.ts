import { driverVehicleDocumentIdSchema, fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories, removeStoredDocument } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string; documentId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id, documentId } = await params;
  const parsedId = driverVehicleDocumentIdSchema.safeParse(documentId);
  if (!parsedId.success) {
    return NextResponse.json(fail('Document introuvable'), { status: 404 });
  }

  try {
    const { courierDossiers } = createRepositories();
    const removed = await courierDossiers.deleteVehicleDocument(auth.session.ctx, id, parsedId.data);
    try {
      await removeStoredDocument(removed.storedRef);
    } catch (err) {
      console.error('[eveider:vehicle-document-storage]', err);
    }
    return NextResponse.json(ok({ id: removed.id }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Impossible de retirer le document';
    if (message === 'Document véhicule introuvable' || message === 'Dossier coursier introuvable') {
      return NextResponse.json(fail(message), { status: 404 });
    }
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
