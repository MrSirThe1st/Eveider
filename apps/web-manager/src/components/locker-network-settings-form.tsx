'use client';

import { colors } from '@eveider/config-ui';
import { NETWORK_SIZE_DEFINITIONS } from '@eveider/domain';
import { Button, useToast } from '@eveider/ui';
import { useState, type FormEvent } from 'react';
import { DurationHoursPicker } from '@/components/duration-hours-picker';
import { fetchJson } from '@/lib/api/fetch-json';
import { MAX_DURATION_HOURS } from '@/lib/duration-hours';
import type { LockerNetworkSettingsDto } from '@/server/locker-settings';

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
    <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 720 }}>
      <section style={{ display: 'grid', gap: '0.85rem' }}>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
          TAILLES S / M / L
        </p>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.secondary, opacity: 0.8 }}>
          Définitions système. Un colis peut aller dans un compartiment de même taille ou plus
          grand ; Eveider propose le plus petit compartiment adapté.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {NETWORK_SIZE_DEFINITIONS.map((definition) => (
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

      <form onSubmit={(event) => void handleSave(event)} style={{ display: 'grid', gap: '1.5rem' }}>
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
            <DurationHoursPicker
              id="pickup-hold"
              label="Délai de rétention gratuit"
              minHours={1}
              maxHours={MAX_DURATION_HOURS}
              value={settings.pickupHoldHours}
              onChange={(pickupHoldHours) =>
                setSettings({
                  ...settings,
                  pickupHoldHours,
                  pickupReminderHours: Math.min(settings.pickupReminderHours, pickupHoldHours),
                })
              }
            />
            <DurationHoursPicker
              id="pickup-reminder"
              label="Rappel avant échéance"
              minHours={0}
              maxHours={Math.min(MAX_DURATION_HOURS, settings.pickupHoldHours)}
              value={settings.pickupReminderHours}
              onChange={(pickupReminderHours) => setSettings({ ...settings, pickupReminderHours })}
            />
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.textMuted }}>
            Après ce délai gratuit à partir de « prêt au retrait », le stockage (tarif
            Facturation) s’applique par période de 24 h pour les casiers à compartiments.
          </p>
        </section>

        <Button type="submit" loading={saving} style={{ width: 'fit-content', fontWeight: 700 }}>
          Enregistrer
        </Button>
      </form>
    </div>
  );
}
