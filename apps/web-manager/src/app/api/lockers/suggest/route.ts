import { suggestLockerName } from '@eveider/domain';
import { createRepositories } from '@eveider/data-access';
import { fail, ok } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.trim() ?? '';

  if (address.length < 2) {
    return NextResponse.json(fail('Adresse requise'), { status: 400 });
  }

  try {
    const { lockers } = createRepositories();
    const suggestion = await lockers.suggestCode(address);

    return NextResponse.json(
      ok({
        code: suggestion.code,
        prefix: suggestion.prefix,
        name: suggestLockerName(address),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
