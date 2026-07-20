'use client';

import { colors, radius } from '@eveider/config-ui';
import { useState } from 'react';
import { IconEye, IconEyeOff } from './icons.js';

export type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password';
  minLength?: number;
  required?: boolean;
  id?: string;
};

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required,
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', marginTop: '0.5rem' }}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{
          display: 'block',
          width: '100%',
          height: 48,
          padding: '0 44px 0 12px',
          border: `2px solid ${colors.border}`,
          borderRadius: radius.button,
          fontWeight: 500,
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        style={{
          position: 'absolute',
          right: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: colors.secondary,
          opacity: 0.65,
        }}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
