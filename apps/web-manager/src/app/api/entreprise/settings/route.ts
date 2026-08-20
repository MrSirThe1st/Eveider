import { fail, ok, updateBusinessSettingsSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function PATCH(request: Request) {
  const auth = await requireBusinessSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = updateBusinessSettingsSchema.safeParse(await request.json().catch(() => null));
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
    const { businessOnboarding, users } = createRepositories();
    const [business] = await Promise.all([
      businessOnboarding.updateAccountSettings(businessId, body.data),
      body.data.fullName
        ? users.updateProfile(auth.session.profile.id, { fullName: body.data.fullName })
        : Promise.resolve(null),
    ]);

    return NextResponse.json(ok({ businessId: business.id }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
