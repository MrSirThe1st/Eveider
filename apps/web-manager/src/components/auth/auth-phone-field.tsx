'use client';

import { DRC_PHONE_PREFIX, toE164Phone, toNationalPhoneDigits } from '@eveider/domain';
import styles from './auth-shell.module.css';

type AuthPhoneFieldProps = {
  label: string;
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
  hint?: string;
};

export function AuthPhoneField({ label, value, onChange, required, hint }: AuthPhoneFieldProps) {
  const local = toNationalPhoneDigits(value);

  return (
    <div className={styles.field}>
      <span>{label}</span>
      <div className={styles.phoneRow}>
        <span className={styles.phonePrefix}>{DRC_PHONE_PREFIX}</span>
        <input
          className={styles.input}
          type="tel"
          inputMode="numeric"
          required={required}
          value={local}
          onChange={(event) => onChange(toE164Phone(event.target.value))}
          placeholder="810000000"
          autoComplete="tel-national"
          aria-label={`${label}, indicatif ${DRC_PHONE_PREFIX}`}
        />
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
