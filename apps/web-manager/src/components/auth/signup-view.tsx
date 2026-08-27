'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OTP_VISUAL, SIGNUP_HEADINGS, SIGNUP_VISUALS } from './auth-copy';
import { AuthRoleTabs, type SignupRole } from './auth-role-tabs';
import styles from './auth-shell.module.css';
import { AuthSplitShell } from './auth-split-shell';
import { SignupBusinessForm } from './signup-business-form';
import { SignupMobileForm } from './signup-mobile-form';

type SignupViewProps = {
  inviteToken?: string;
};

export function SignupView({ inviteToken }: SignupViewProps) {
  const joiningTeam = Boolean(inviteToken);
  const [role, setRole] = useState<SignupRole>('business');
  const [otpStep, setOtpStep] = useState(false);

  const visual = otpStep && role === 'business' ? OTP_VISUAL : SIGNUP_VISUALS[role];
  const visualKey = otpStep && role === 'business' ? 'otp' : role;
  const heading = joiningTeam
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
        onSelect: () => {
          setOtpStep(false);
          setRole(item.key);
        },
      })),
    [role],
  );

  function handleRoleChange(next: SignupRole) {
    setOtpStep(false);
    setRole(next);
  }

  return (
    <AuthSplitShell
      visual={visual}
      visualKey={visualKey}
      dots={joiningTeam ? [] : dots}
      toolbar={joiningTeam ? null : <AuthRoleTabs value={role} onChange={handleRoleChange} />}
    >
      <div className={styles.formCardHead}>
        <div className={styles.panelHead}>
          <h1 className={styles.panelTitle}>{otpStep ? 'Vérifier le téléphone' : heading.title}</h1>
          <p className={styles.panelSub}>
            {otpStep ? 'Entrez le code reçu pour activer le compte.' : heading.sub}
          </p>
          {joiningTeam || otpStep || role === 'business' ? null : (
            <p className={styles.panelSub}>
              Les coursiers sont invités par Eveider ou par leur entreprise — pas d’inscription libre.
            </p>
          )}
        </div>
      </div>
      <div className={styles.formCardBody}>
        <div
          key={otpStep ? 'otp' : role}
          id={`signup-panel-${role}`}
          role="tabpanel"
          aria-labelledby={`signup-tab-${role}`}
        >
          {role === 'business' || joiningTeam ? (
            <SignupBusinessForm onOtpStepChange={setOtpStep} inviteToken={inviteToken} />
          ) : (
            <SignupMobileForm key={role} role={role} />
          )}
        </div>
        {otpStep ? null : (
          <p className={styles.switchLine}>
            Déjà un compte ? <Link href="/connexion">Se connecter</Link>
          </p>
        )}
      </div>
    </AuthSplitShell>
  );
}
