import { fail, MAX_DRIVER_VEHICLE_DOCUMENTS, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories, uploadIdentityDocument } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

function asFiles(form: FormData): File[] {
  return form
    .getAll('vehicleDocument')
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(fail('Ajoutez un fichier'), { status: 400 });
  }

  const files = asFiles(form);
  if (files.length === 0) {
    return NextResponse.json(fail('Ajoutez un fichier'), { status: 400 });
  }
  if (files.length > MAX_DRIVER_VEHICLE_DOCUMENTS) {
    return NextResponse.json(fail(`Au plus ${MAX_DRIVER_VEHICLE_DOCUMENTS} documents véhicule`), {
      status: 400,
    });
  }

  try {
    const { courierDossiers } = createRepositories();
    const existing = await courierDossiers.listVehicleDocuments(auth.session.ctx, id);
    if (existing.length + files.length > MAX_DRIVER_VEHICLE_DOCUMENTS) {
      return NextResponse.json(fail(`Au plus ${MAX_DRIVER_VEHICLE_DOCUMENTS} documents véhicule`), {
        status: 400,
      });
    }

    const documents = [];
    for (const file of files) {
      const uploaded = await uploadIdentityDocument({
        bytes: new Uint8Array(await file.arrayBuffer()),
        fileName: file.name,
        declaredMimeType: file.type || undefined,
        kind: 'vehicle',
        uploadedByUserId: auth.session.profile.id,
        tooSmallError: 'Fichier invalide',
      });
      const saved = await courierDossiers.addVehicleDocument(auth.session.ctx, id, {
        storedRef: uploaded.storedRef,
        fileName: uploaded.fileName,
      });
      documents.push({
        id: saved.id,
        storedRef: saved.storedRef,
        fileName: saved.fileName,
      });
    }

    return NextResponse.json(ok({ documents }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Impossible d’enregistrer le document';
    if (message === 'Dossier coursier introuvable') {
      return NextResponse.json(fail(message), { status: 404 });
    }
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
