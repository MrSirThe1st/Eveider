'use client';

import { colors, webInputStyle } from '@eveider/config-ui';
import {
  ASSIGNMENT_STRATEGIES,
  ASSIGNMENT_STRATEGY_LABELS,
  SIZE_MATCHING_MODES,
  SIZE_MATCHING_MODE_LABELS,
  type AssignmentStrategy,
  type SizeMatchingMode,
} from '@eveider/domain';
import { Button, useToast } from '@eveider/ui';
import { useState, type FormEvent } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import type { LockerNetworkSettingsDto } from '@/server/locker-settings';

const inputStyle = { ...webInputStyle, width: '100%', height: 44, padding: '0 0.75rem' };
const selectStyle = { ...inputStyle, appearance: 'auto' as const };

type LockerNetworkSettingsFormProps = {
  initialSettings: LockerNetworkSettingsDto;
};

export function LockerNetworkSettingsForm({ initialSettings }: LockerNetworkSettingsFormProps) {
  const toast = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await fetchJson<{ settings: LockerNetworkSettingsDto }>('/api/locker-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizeMatchingMode: settings.sizeMatchingMode,
          assignmentStrategy: settings.assignmentStrategy,
          pickupHoldHours: settings.pickupHoldHours,
          pickupReminderHours: settings.pickupReminderHours,
        }),
      });
      setSettings(data.settings);
      toast.success('Configuration casiers mise à jour');
    } catch {
      toast.error('Échec de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSave(event)}
      style={{ display: 'grid', gap: '1.5rem', maxWidth: 720 }}
    >
      <section style={{ display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          TAILLES S / M / L
        </p>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.secondary, opacity: 0.8 }}>
          Définition réseau globale. Dimensions et poids pourront être ajoutés plus tard ; pour
          l’instant seules les tailles nominales sont utilisées.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {settings.sizeDefinitions.map((definition) => (
            <span
              key={definition.size}
              style={{
                padding: '0.45rem 0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: colors.surface,
              }}
            >
              {definition.shortLabel} — {definition.label}
            </span>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          CORRESPONDANCE COLIS → COMPARTIMENT
        </p>
        <label>
          Correspondance de taille (suggestion)
          <select
            value={settings.sizeMatchingMode}
            onChange={(e) =>
              setSettings({
                ...settings,
                sizeMatchingMode: e.target.value as SizeMatchingMode,
              })
            }
            style={selectStyle}
          >
            {SIZE_MATCHING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {SIZE_MATCHING_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stratégie d’affectation (suggestion)
          <select
            value={settings.assignmentStrategy}
            onChange={(e) =>
              setSettings({
                ...settings,
                assignmentStrategy: e.target.value as AssignmentStrategy,
              })
            }
            style={selectStyle}
          >
            {ASSIGNMENT_STRATEGIES.map((strategy) => (
              <option key={strategy} value={strategy}>
                {ASSIGNMENT_STRATEGY_LABELS[strategy]}
              </option>
            ))}
          </select>
        </label>
        <p style={{ margin: 0, fontSize: '0.75rem', color: colors.secondary, opacity: 0.75 }}>
          Ces règles suggèrent un compartiment ; le coursier ou l’opérateur garde le dernier mot.
        </p>
      </section>

      <section style={{ display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          RÉTENTION / RETRAIT
        </p>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}
        >
          <label>
            Délai de rétention gratuit (heures)
            <input
              type="number"
              min={1}
              max={720}
              value={settings.pickupHoldHours}
              onChange={(e) =>
                setSettings({ ...settings, pickupHoldHours: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
          <label>
            Rappel avant échéance (heures)
            <input
              type="number"
              min={0}
              max={720}
              value={settings.pickupReminderHours}
              onChange={(e) =>
                setSettings({ ...settings, pickupReminderHours: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </label>
        </div>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
          Après ce délai gratuit à partir de « prêt pour retrait », la location casier (tarif
          Facturation) s’applique par période de 24 h pour les casiers à compartiments.
        </p>
      </section>

      <Button type="submit" loading={saving} style={{ width: 'fit-content', fontWeight: 700 }}>
        Enregistrer
      </Button>
    </form>
  );
}
