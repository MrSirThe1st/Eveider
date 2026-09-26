import { fail, ok, updateDriverAvailabilitySchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireCourierSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function PATCH(request: Request) {
  const auth = await requireCourierSession(request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status }),
    );
  }

  const body = updateDriverAvailabilitySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return withMobileCors(
      NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  try {
    const { courierDossiers } = createRepositories();
    const dossier = await courierDossiers.updateAcceptingWork(
      auth.session.ctx,
      body.data.isAcceptingWork,
    );

    return withMobileCors(
      NextResponse.json(
        ok({
          isAcceptingWork: dossier.isAcceptingWork,
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('introuvable') ? 404 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
