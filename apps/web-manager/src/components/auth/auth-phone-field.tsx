'use client';

import styles from './auth-shell.module.css';

const PREFIX = '+243';

type AuthPhoneFieldProps = {
  label: string;
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
  hint?: string;
};

export function AuthPhoneField({ label, value, onChange, required, hint }: AuthPhoneFieldProps) {
  const local = value.replace(/^\+243\s*/, '').replace(/^\+243/, '');

  return (
    <div className={styles.field}>
      <span>{label}</span>
      <div className={styles.phoneRow}>
        <span className={styles.phonePrefix}>{PREFIX}</span>
        <input
          className={styles.input}
          type="tel"
          inputMode="numeric"
          required={required}
          value={local}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d\s]/g, '');
            const compact = digits.replace(/\s/g, '');
            onChange(compact ? `${PREFIX}${compact}` : '');
          }}
          placeholder="810 000 000"
          autoComplete="tel-national"
          aria-label={`${label}, indicatif ${PREFIX}`}
        />
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
