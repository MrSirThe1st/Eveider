import { fail, ok, paymentSetupStepSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function PATCH(request: Request) {
  const auth = await requireBusinessSession(undefined, 'billing');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = paymentSetupStepSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const businessId = auth.session.profile.businessId;
  if (!businessId) {
    return NextResponse.json(fail('Compte entreprise requis'), { status: 403 });
  }

  try {
    const { businessOnboarding } = createRepositories();
    await businessOnboarding.savePaymentSetup(businessId, body.data);
    return NextResponse.json(ok({ saved: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
