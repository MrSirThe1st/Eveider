import { changeAccountEmailSchema, fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import {
  hasOrganizationWebAccess,
  hasPlatformDashboardAccess,
} from '@eveider/domain';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { invalidateCurrentUserCache } from '@/lib/auth/resolve-current-user';
import { getPortalOrigin } from '@/lib/portal-url';
import { createClient } from '@/lib/supabase/server';

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Mot de passe actuel incorrect';
  }
  if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
    return 'Cette adresse e-mail est déjà utilisée';
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  return message || 'Impossible de modifier l’e-mail';
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

  const body = changeAccountEmailSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  const currentEmail = current.profile.email?.trim() ?? current.authUser.email?.trim() ?? '';
  if (!currentEmail) {
    return NextResponse.json(fail('Aucun e-mail de connexion associé à ce compte'), {
      status: 400,
    });
  }

  const nextEmail = body.data.email.trim().toLowerCase();
  if (nextEmail === currentEmail.toLowerCase()) {
    return NextResponse.json(fail('Indiquez une adresse e-mail différente'), { status: 400 });
  }

  try {
    const { users } = createRepositories();
    const existing = await users.findByEmail(nextEmail);
    if (existing && existing.id !== current.profile.id) {
      return NextResponse.json(fail('Cette adresse e-mail est déjà utilisée'), { status: 409 });
    }

    const supabase = await createClient();
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: body.data.currentPassword,
    });
    if (reauthError) {
      return NextResponse.json(fail(mapAuthError(reauthError.message)), { status: 400 });
    }

    const emailRedirectTo = `${getPortalOrigin()}/auth/callback`;
    const { error: updateError } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo },
    );
    if (updateError) {
      return NextResponse.json(fail(mapAuthError(updateError.message)), { status: 400 });
    }

    invalidateCurrentUserCache(current.authUser.id);

    return NextResponse.json(
      ok({
        pendingEmail: nextEmail,
        message:
          'Un e-mail de confirmation a été envoyé à la nouvelle adresse. L’e-mail de connexion sera mis à jour après confirmation.',
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}
