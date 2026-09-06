import {
  fail,
  ok,
  registerBusinessAccountSchema,
  registerBusinessAccountResponseSchema,
} from '@eveider/api-contracts';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
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
    const joinedExistingCompany =
      result.joinedExistingCompany || Boolean(parsed.data.inviteToken);

    const response = registerBusinessAccountResponseSchema.parse({
      user: {
        id: result.user.id,
        authId: result.user.authId,
        email: result.user.email,
        phone: result.user.phone,
        fullName: result.user.fullName,
        isBlocked: Boolean(result.user.isBlocked),
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        status: result.business.status,
        contactPhone: result.business.contactPhone,
        isPhoneVerified: Boolean(result.business.isPhoneVerified),
      },
      joinedExistingCompany,
    });

    return NextResponse.json(ok(response));
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        fail(err.errors[0]?.message ?? 'Réponse serveur invalide'),
        { status: 500 },
      );
    }
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
