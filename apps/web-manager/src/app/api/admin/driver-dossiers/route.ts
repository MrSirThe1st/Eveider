import { createCourierDossierSchema, fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories, uploadIdentityDocument } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { loadAdminDriverRoster } from '@/server/drivers';

function formText(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const drivers = await loadAdminDriverRoster(auth.session.ctx);
    return NextResponse.json(ok({ drivers }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const contentType = request.headers.get('content-type') ?? '';
  let payload: unknown;

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('idDocument');
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(fail('Pièce d’identité requise'), { status: 400 });
      }

      const uploaded = await uploadIdentityDocument({
        bytes: new Uint8Array(await file.arrayBuffer()),
        fileName: file.name,
        declaredMimeType: file.type || undefined,
        kind: 'driver_id',
        uploadedByUserId: auth.session.profile.id,
      });

      payload = {
        fullName: formText(form, 'fullName') ?? '',
        email: formText(form, 'email') ?? '',
        phone: formText(form, 'phone'),
        notes: formText(form, 'notes'),
        serviceAreaId: formText(form, 'serviceAreaId') ?? null,
        idDocumentUrl: uploaded.storedRef,
        contractorType: 'eveider',
      };
    } else {
      payload = await request.json().catch(() => null);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Impossible d’enregistrer la pièce';
    return NextResponse.json(fail(message), { status: 400 });
  }

  const body = createCourierDossierSchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { courierDossiers, accounts } = createRepositories();
    const dossier = await courierDossiers.create(auth.session.ctx, {
      contractorType: 'eveider',
      fullName: body.data.fullName,
      email: body.data.email,
      phone: body.data.phone,
      idDocumentUrl: body.data.idDocumentUrl,
      notes: body.data.notes,
      serviceAreaId: body.data.serviceAreaId,
    });
    let invited = false;
    try {
      await accounts.inviteDossier(auth.session.ctx, dossier.id);
      invited = true;
    } catch (inviteErr) {
      console.error('[eveider:driver-invite]', inviteErr);
    }
    return NextResponse.json(
      ok({ id: dossier.id, status: dossier.status, invited }),
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
