import {
  fail,
  ok,
  registerBusinessAccountSchema,
  registerBusinessAccountResponseSchema,
} from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { registerBusinessAccount } from '@/server/auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerBusinessAccountSchema.safeParse(json);

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
          fullName: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
          phone: parsed.data.phone,
        },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        fail(authError?.message ?? 'Impossible de créer le compte utilisateur'),
        { status: 400 },
      );
    }

    const result = await registerBusinessAccount(authData.user.id, parsed.data);
    const response = registerBusinessAccountResponseSchema.parse({
      user: result.user,
      business: result.business,
    });

    return NextResponse.json(ok(response));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
