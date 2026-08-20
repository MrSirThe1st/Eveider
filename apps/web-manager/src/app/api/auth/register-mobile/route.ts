import { fail, ok, registerMobileAccountSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerMobileAccountSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Champs invalides'), {
        status: 400,
      });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          role: parsed.data.role,
        },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        fail(authError?.message ?? 'Impossible de créer le compte utilisateur'),
        { status: 400 },
      );
    }

    const { onboarding } = createRepositories();
    const profile = await onboarding.ensureProfile(authData.user.id, {
      role: parsed.data.role,
      email: parsed.data.email,
      phone: parsed.data.phone?.trim() || undefined,
      fullName: parsed.data.fullName,
    });

    return NextResponse.json(
      ok({
        id: profile.id,
        role: profile.role,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
