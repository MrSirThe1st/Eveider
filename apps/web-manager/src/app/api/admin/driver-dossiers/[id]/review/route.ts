import { fail, ok, reviewCourierDossierSchema } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const body = reviewCourierDossierSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { courierDossiers } = createRepositories();
    const dossier = await courierDossiers.review(auth.session.ctx, id, {
      status: body.data.status,
      reviewNotes: body.data.reviewNotes,
    });
    return NextResponse.json(ok({ id: dossier.id, status: dossier.status }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}
