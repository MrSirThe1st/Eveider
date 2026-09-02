import {
  fail,
  ok,
  updateCourierDossierSchema,
  updateDriverServiceAreaSchema,
} from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession(undefined, 'manage_couriers');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const raw = await request.json().catch(() => null);
  const serviceAreaOnly = updateDriverServiceAreaSchema.safeParse(raw);
  if (
    serviceAreaOnly.success &&
    raw &&
    typeof raw === 'object' &&
    Object.keys(raw as object).length === 1 &&
    'serviceAreaId' in (raw as object)
  ) {
    try {
      const { courierDossiers } = createRepositories();
      const dossier = await courierDossiers.updateServiceArea(
        auth.session.ctx,
        id,
        serviceAreaOnly.data.serviceAreaId,
      );
      return NextResponse.json(
        ok({ id: dossier.id, serviceAreaId: dossier.serviceAreaId, status: dossier.status }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur serveur';
      const status = err instanceof AccessDeniedError ? 403 : 400;
      return NextResponse.json(fail(message), { status });
    }
  }

  const body = updateCourierDossierSchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { courierDossiers } = createRepositories();
    if (body.data.serviceAreaId !== undefined) {
      await courierDossiers.updateServiceArea(auth.session.ctx, id, body.data.serviceAreaId);
    }
    const hasDraftFields =
      body.data.fullName !== undefined ||
      body.data.email !== undefined ||
      body.data.phone !== undefined ||
      body.data.idDocumentUrl !== undefined ||
      body.data.notes !== undefined;
    if (!hasDraftFields) {
      const dossier = await courierDossiers.requireInScope(auth.session.ctx, id);
      return NextResponse.json(
        ok({ id: dossier.id, serviceAreaId: dossier.serviceAreaId, status: dossier.status }),
      );
    }
    const dossier = await courierDossiers.updateDraft(auth.session.ctx, id, {
      fullName: body.data.fullName,
      email: body.data.email,
      phone: body.data.phone,
      idDocumentUrl: body.data.idDocumentUrl,
      notes: body.data.notes,
    });
    return NextResponse.json(
      ok({ id: dossier.id, serviceAreaId: dossier.serviceAreaId, status: dossier.status }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
