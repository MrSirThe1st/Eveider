import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  try {
    const { driverInvites } = createRepositories();
    const invite = await driverInvites.getPreview(token);
    if (!invite) {
      return NextResponse.json(fail('Invitation introuvable'), { status: 404 });
    }
    return NextResponse.json(ok({ invite }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
