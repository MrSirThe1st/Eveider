import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { withMobileCors } from '@/lib/mobile-session';

type RouteParams = { params: Promise<{ token: string }> };

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;

  try {
    const { invites } = createRepositories();
    const preview = await invites.getPreview(token);

    if (!preview) {
      return withMobileCors(
        NextResponse.json(fail('Invitation introuvable'), { status: 404 }),
      );
    }

    return withMobileCors(NextResponse.json(ok({ invite: preview })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('expiré') || message.includes('utilisée') ? 410 : 500;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
