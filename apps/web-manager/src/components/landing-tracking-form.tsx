'use client';

import { colors, webInputStyle } from '@eveider/config-ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export function LandingTrackingForm() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    router.push(`/suivi?mode=tracking&tracking=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        maxWidth: 560,
      }}
    >
      <input
        type="text"
        value={trackingNumber}
        onChange={(event) => setTrackingNumber(event.target.value)}
        placeholder="Numéro de suivi (ex. EVD26A7K3M2PX)"
        aria-label="Numéro de suivi"
        style={{
          ...webInputStyle,
          flex: '1 1 220px',
          height: 48,
          padding: '0 1rem',
          fontSize: '0.875rem',
          outline: 'none',
          backgroundColor: colors.surface,
        }}
      />
      <button
        type="submit"
        className="btn btn-primary"
        style={{ height: 48, padding: '0 1.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
      >
        SUIVRE MON COLIS →
      </button>
    </form>
  );
}
