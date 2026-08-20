'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OTP_VISUAL, SIGNUP_HEADINGS, SIGNUP_VISUALS } from './auth-copy';
import { AuthRoleTabs, type SignupRole } from './auth-role-tabs';
import styles from './auth-shell.module.css';
import { AuthSplitShell } from './auth-split-shell';
import { SignupBusinessForm } from './signup-business-form';
import { SignupMobileForm } from './signup-mobile-form';

export function SignupView() {
  const [role, setRole] = useState<SignupRole>('business');
  const [otpStep, setOtpStep] = useState(false);

  const visual = otpStep && role === 'business' ? OTP_VISUAL : SIGNUP_VISUALS[role];
  const visualKey = otpStep && role === 'business' ? 'otp' : role;
  const heading = SIGNUP_HEADINGS[role];

  const dots = useMemo(
    () =>
      [
        { key: 'business' as const, label: 'Entreprise' },
        { key: 'customer' as const, label: 'Client' },
        { key: 'courier' as const, label: 'Coursier' },
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
      dots={dots}
      toolbar={<AuthRoleTabs value={role} onChange={handleRoleChange} />}
    >
      <div className={styles.formCardHead}>
        <div className={styles.panelHead}>
          <h1 className={styles.panelTitle}>{otpStep ? 'Vérifier le téléphone' : heading.title}</h1>
          <p className={styles.panelSub}>
            {otpStep ? 'Entrez le code reçu pour activer le compte.' : heading.sub}
          </p>
        </div>
      </div>
      <div className={styles.formCardBody}>
        <div
          key={otpStep ? 'otp' : role}
          id={`signup-panel-${role}`}
          role="tabpanel"
          aria-labelledby={`signup-tab-${role}`}
        >
          {role === 'business' ? (
            <SignupBusinessForm onOtpStepChange={setOtpStep} />
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
