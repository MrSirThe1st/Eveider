import { fail, ok, registerDriverSchema } from '@eveider/api-contracts';
import { createSupabaseAdminClient } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerDriverAccount } from '@/server/auth';

async function ensureAuthUserWithPassword(email: string, password: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error && data.user) {
    return data.user.id;
  }

  if (error && /already|registered|exists|déjà/i.test(error.message)) {
    const admin = createSupabaseAdminClient();
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const authId = link.data.user?.id;
    if (!authId) {
      throw new Error(link.error?.message ?? 'Compte Auth introuvable');
    }
    const updated = await admin.auth.admin.updateUserById(authId, {
      password,
      email_confirm: true,
    });
    if (updated.error) {
      throw new Error(updated.error.message);
    }
    return authId;
  }

  throw new Error(error?.message ?? 'Impossible de créer le compte');
}

export async function POST(request: Request) {
  const body = registerDriverSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const authId = await ensureAuthUserWithPassword(body.data.email, body.data.password);
    const result = await registerDriverAccount(authId, body.data);
    return NextResponse.json(ok(result), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}
