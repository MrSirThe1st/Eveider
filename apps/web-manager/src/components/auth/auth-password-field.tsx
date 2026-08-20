'use client';

import { useState } from 'react';
import styles from './auth-shell.module.css';

type AuthPasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password';
};

export function AuthPasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.passwordWrap}>
        <input
          className={styles.input}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          minLength={8}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className={styles.eyeBtn}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 3l18 18M10.5 10.7a3 3 0 004.1 4.1M9.9 5.2A10.7 10.7 0 0112 5c5.5 0 9.5 4.5 10.5 7-.4 1-1.2 2.4-2.4 3.7M6.7 6.7C4.6 8.3 3.3 10.4 2.5 12c.7 1.6 2.6 4.6 5.6 6.3A11 11 0 0012 19c.7 0 1.4-.1 2.1-.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2.5 12C3.6 9.4 7.2 5 12 5s8.4 4.4 9.5 7c-1.1 2.6-4.7 7-9.5 7s-8.4-4.4-9.5-7z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
