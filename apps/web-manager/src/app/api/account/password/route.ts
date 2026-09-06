import { fail, ok, changePasswordSchema } from '@eveider/api-contracts';
import {
  hasOrganizationWebAccess,
  hasPlatformDashboardAccess,
} from '@eveider/domain';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createClient } from '@/lib/supabase/server';

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Mot de passe actuel incorrect';
  }
  if (lower.includes('same password') || lower.includes('different from the old')) {
    return 'Le nouveau mot de passe doit être différent de l’actuel';
  }
  if (lower.includes('weak') || lower.includes('least')) {
    return 'Le mot de passe doit contenir au moins 8 caractères';
  }
  return message || 'Impossible de modifier le mot de passe';
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json(fail('Non authentifié'), { status: 401 });
  }

  const memberships = current.memberships.map((membership) => ({
    organizationId: membership.businessId,
    role: membership.role,
    isPlatformOrg: membership.isPlatformOrg,
  }));

  const isAdmin = hasPlatformDashboardAccess(current.profile.platformRole, memberships);
  const isOrg = hasOrganizationWebAccess(memberships);
  if (!isAdmin && !isOrg) {
    return NextResponse.json(fail('Accès refusé'), { status: 403 });
  }

  const body = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const email = current.profile.email?.trim();
  if (!email) {
    return NextResponse.json(fail('Aucun e-mail de connexion associé à ce compte'), {
      status: 400,
    });
  }

  const { currentPassword, newPassword } = body.data;

  try {
    const supabase = await createClient();

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (reauthError) {
      return NextResponse.json(fail(mapAuthError(reauthError.message)), { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return NextResponse.json(fail(mapAuthError(updateError.message)), { status: 400 });
    }

    return NextResponse.json(ok({ updated: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
