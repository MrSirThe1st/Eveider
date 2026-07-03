import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUSINESS_ROLES = ['business', 'admin'] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(fail('Non authentifié'), { status: 401 });
    }

    const { onboarding } = createRepositories();
    const profile = await onboarding.requireRole(user.id, BUSINESS_ROLES);

    return NextResponse.json(
      ok({
        authId: user.id,
        phone: user.phone,
        email: user.email ?? profile.email,
        profile: {
          id: profile.id,
          role: profile.role,
          fullName: profile.fullName,
          email: profile.email,
          businessId: profile.businessId,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 403 });
  }
}
