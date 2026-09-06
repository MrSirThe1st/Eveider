'use client';

import { colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { useSyncExternalStore } from 'react';
import {
  applyThemePreference,
  readThemePreference,
  subscribeTheme,
  type ThemePreference,
} from '@/lib/theme';

const APPEARANCE_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  { value: 'light', label: 'Clair', description: 'Fond clair, cartes blanches' },
  { value: 'dark', label: 'Sombre', description: 'Fond sombre' },
  {
    value: 'system',
    label: 'Automatique',
    description: 'Suit les réglages de l’appareil',
  },
];

function getServerPreference(): ThemePreference {
  return 'system';
}

export function AccountPreferencesPanel() {
  const preference = useSyncExternalStore(subscribeTheme, readThemePreference, getServerPreference);

  return (
    <section style={{ display: 'grid', gap: spacing[4] }}>
      <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
        <div>
          <h2 style={{ margin: 0, ...typography.sectionTitle }}>Langue</h2>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            Eveider s’affiche en français sur le portail.
          </p>
        </div>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            padding: `${spacing[3]}px ${spacing[4]}px`,
            background: colors.surfaceSubtle,
            borderRadius: 8,
          }}
        >
          Français
        </p>
      </div>

      <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
        <div>
          <h2 style={{ margin: 0, ...typography.sectionTitle }}>Apparence</h2>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            Choisissez un affichage clair, sombre, ou qui suit votre appareil.
          </p>
        </div>

        <div role="radiogroup" aria-label="Apparence" style={{ display: 'grid', gap: spacing[2] }}>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => applyThemePreference(option.value)}
                suppressHydrationWarning
                style={{
                  display: 'grid',
                  gap: 4,
                  textAlign: 'left',
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  borderRadius: 8,
                  border: selected ? `2px solid ${colors.secondary}` : `1px solid ${colors.border}`,
                  background: selected ? colors.surfaceSubtle : 'transparent',
                  color: colors.secondary,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 600 }}>{option.label}</span>
                <span style={{ color: colors.textMuted, fontSize: 13 }}>{option.description}</span>
              </button>
            );
          })}
        </div>

        <p style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>
          Si les cookies de préférence sont acceptés, ce choix d’apparence est mémorisé sur cet
          appareil.
        </p>
      </div>
    </section>
  );
}
