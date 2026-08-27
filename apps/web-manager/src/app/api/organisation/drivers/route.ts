import { createCourierDossierSchema, fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';
import { loadAssignableBusinessCouriers, loadBusinessCourierDossiers } from '@/server/couriers';

export async function GET() {
  const auth = await requireBusinessSession(undefined, 'manage_couriers');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const [dossiers, assignable] = await Promise.all([
      loadBusinessCourierDossiers(auth.session.ctx),
      loadAssignableBusinessCouriers(auth.session.profile.businessId!),
    ]);
    return NextResponse.json(ok({ dossiers, assignable }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'manage_couriers');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = createCourierDossierSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { courierDossiers } = createRepositories();
    const dossier = await courierDossiers.create(auth.session.ctx, {
      contractorType: 'business',
      fullName: body.data.fullName,
      email: body.data.email,
      phone: body.data.phone,
      idDocumentUrl: body.data.idDocumentUrl,
      notes: body.data.notes,
    });
    return NextResponse.json(ok({ id: dossier.id, status: dossier.status }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
