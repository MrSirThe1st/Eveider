import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireOrgApiKey } from '@/lib/org-api-session';

export async function GET(request: Request) {
  const auth = await requireOrgApiKey(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { lockers } = createRepositories();
    const points = await lockers.listActivePickerOptions();
    return NextResponse.json(ok({ points }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
