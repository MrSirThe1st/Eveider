import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ token: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireCustomerSession(_request);
  if ('error' in auth) {
    return withMobileCors(
      NextResponse.json(fail(auth.error ?? 'Accès refusé'), { status: auth.status ?? 401 }),
    );
  }

  const { token } = await params;

  try {
    const { invites } = createRepositories();
    await invites.accept(token, auth.session.profile.id, auth.session.profile.phone);

    return withMobileCors(NextResponse.json(ok({ accepted: true })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('introuvable') ? 404
      : message.includes('expiré') || message.includes('utilisée') || message.includes('correspond') ? 409
      : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
