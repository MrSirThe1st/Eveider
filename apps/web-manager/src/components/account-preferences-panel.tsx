'use client';

import { colors } from '@eveider/config-ui';
import { useSyncExternalStore } from 'react';
import {
  applyThemePreference,
  readThemePreference,
  subscribeTheme,
  type ThemePreference,
} from '@/lib/theme';
import { SettingsFormSection } from '@/components/ops-ui';

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
    <div className="ops-form">
      <SettingsFormSection title="Langue" description="Eveider s’affiche en français sur le portail.">
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            padding: '0.65rem 0.85rem',
            background: colors.surfaceSubtle,
            borderRadius: 8,
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
          Français
        </p>
      </SettingsFormSection>

      <SettingsFormSection
        title="Apparence"
        description="Choisissez un affichage clair, sombre, ou qui suit votre appareil."
      >
        <div role="radiogroup" aria-label="Apparence" style={{ display: 'grid', gap: 8 }}>
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
                  padding: '0.75rem 0.9rem',
                  borderRadius: 8,
                  border: selected ? `2px solid ${colors.secondary}` : `1px solid ${colors.border}`,
                  background: selected ? colors.surfaceSubtle : colors.surface,
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
        <p style={{ margin: '0.85rem 0 0', color: colors.textMuted, fontSize: 13 }}>
          Si les cookies de préférence sont acceptés, ce choix d’apparence est mémorisé sur cet
          appareil.
        </p>
      </SettingsFormSection>
    </div>
  );
}
