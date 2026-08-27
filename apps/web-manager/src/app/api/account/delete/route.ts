import { fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireCustomerSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const auth = await requireCustomerSession(request);
  if ('error' in auth) {
    return withMobileCors(NextResponse.json(fail(auth.error ?? 'Non authentifié'), { status: auth.status }));
  }

  try {
    const { accounts } = createRepositories();
    await accounts.deleteCustomer(auth.session.profile);
    return withMobileCors(NextResponse.json(ok({ deleted: true })));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return withMobileCors(NextResponse.json(fail(message), { status }));
  }
}
