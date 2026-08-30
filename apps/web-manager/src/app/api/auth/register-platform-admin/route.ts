import { fail, ok, registerPlatformAdminSchema } from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerPlatformAdminAccount } from '@/server/auth';

export async function POST(request: Request) {
  const body = registerPlatformAdminSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const supabase = await createClient();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: body.data.email,
    password: body.data.password,
  });

  if (signUpError || !authData.user) {
    return NextResponse.json(fail(signUpError?.message ?? 'Impossible de créer le compte'), {
      status: 400,
    });
  }

  try {
    const result = await registerPlatformAdminAccount(authData.user.id, body.data);
    return NextResponse.json(
      ok({
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          platformRole: result.user.platformRole,
        },
      }),
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
