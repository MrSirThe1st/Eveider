'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SIGNUP_HEADINGS, SIGNUP_VISUALS } from './auth-copy';
import { AuthRoleTabs, type SignupRole } from './auth-role-tabs';
import styles from './auth-shell.module.css';
import { AuthSplitShell } from './auth-split-shell';
import { SignupBusinessForm } from './signup-business-form';
import { SignupDriverForm } from './signup-driver-form';
import { SignupMobileForm } from './signup-mobile-form';
import { SignupPlatformAdminForm } from './signup-platform-admin-form';

type SignupViewProps = {
  inviteToken?: string;
  adminInviteToken?: string;
  driverInviteToken?: string;
};

export function SignupView({ inviteToken, adminInviteToken, driverInviteToken }: SignupViewProps) {
  const joiningTeam = Boolean(inviteToken);
  const joiningPlatformAdmin = Boolean(adminInviteToken);
  const joiningDriver = Boolean(driverInviteToken);
  const inviteOnly = joiningTeam || joiningPlatformAdmin || joiningDriver;
  const [role, setRole] = useState<SignupRole>('business');

  const visual = SIGNUP_VISUALS[role];
  const heading = joiningDriver
    ? {
        title: 'Accès chauffeur',
        sub: 'Créez votre compte et choisissez un mot de passe pour accepter l’invitation.',
      }
    : joiningPlatformAdmin
      ? {
          title: 'Administration Eveider',
          sub: 'Créez votre compte pour accepter l’invitation administrateur.',
        }
      : joiningTeam
        ? { title: 'Rejoindre l’équipe', sub: 'Créez votre compte pour accepter l’invitation.' }
        : SIGNUP_HEADINGS[role];

  const dots = useMemo(
    () =>
      [
        { key: 'business' as const, label: 'Entreprise' },
        { key: 'customer' as const, label: 'Client' },
      ].map((item) => ({
        ...item,
        active: item.key === role,
        onSelect: () => setRole(item.key),
      })),
    [role],
  );

  return (
    <AuthSplitShell
      visual={visual}
      visualKey={role}
      dots={inviteOnly ? [] : dots}
      toolbar={inviteOnly ? null : <AuthRoleTabs value={role} onChange={setRole} />}
    >
      <div className={styles.formCardHead}>
        <div className={styles.panelHead}>
          <h1 className={styles.panelTitle}>{heading.title}</h1>
          <p className={styles.panelSub}>{heading.sub}</p>
          {inviteOnly || role === 'business' ? null : (
            <p className={styles.panelSub}>
              Les chauffeurs sont invités par Eveider ou par leur entreprise — pas d’inscription libre.
            </p>
          )}
        </div>
      </div>
      <div className={styles.formCardBody}>
        <div
          key={role}
          id={`signup-panel-${role}`}
          role="tabpanel"
          aria-labelledby={`signup-tab-${role}`}
        >
          {joiningDriver ? (
            <SignupDriverForm driverInviteToken={driverInviteToken!} />
          ) : joiningPlatformAdmin ? (
            <SignupPlatformAdminForm adminInviteToken={adminInviteToken!} />
          ) : role === 'business' || joiningTeam ? (
            <SignupBusinessForm inviteToken={inviteToken} />
          ) : (
            <SignupMobileForm key={role} role={role} />
          )}
        </div>
        <p className={styles.switchLine}>
          Déjà un compte ?{' '}
          <Link
            href={
              driverInviteToken
                ? `/connexion?driverInvite=${encodeURIComponent(driverInviteToken)}`
                : '/connexion'
            }
          >
            Se connecter
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}
