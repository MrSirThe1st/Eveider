import { fail, ok, onboardUserSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(fail('Non authentifié'), { status: 401 });
    }

    const body = onboardUserSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      });
    }

    if (body.data.role !== 'business') {
      return NextResponse.json(fail('Rôle non autorisé sur ce portail'), { status: 400 });
    }

    const { onboarding } = createRepositories();
    const profile = await onboarding.ensureProfile(user.id, {
      role: 'business',
      fullName: body.data.fullName,
      phone: body.data.phone ?? user.phone ?? undefined,
      email: body.data.email ?? user.email ?? undefined,
      business: body.data.business,
    });

    return NextResponse.json(
      ok({
        id: profile.id,
        role: profile.role,
        businessId: profile.businessId,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
