import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  try {
    const { teamInvites } = createRepositories();
    const preview = await teamInvites.getPreview(token);
    if (!preview) {
      return NextResponse.json(fail('Invitation introuvable'), { status: 404 });
    }
    return NextResponse.json(ok({ invite: preview }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invitation invalide';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
