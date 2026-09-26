'use client';

import { colors } from '@eveider/config-ui';
import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';
import { SettingsFormSection } from '@/components/ops-ui';

export function NotificationSettingsPanel() {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJson<{ emailNotificationsEnabled: boolean }>(
          '/api/notifications/preferences',
        );
        if (!cancelled) setEmailEnabled(data.emailNotificationsEnabled);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger les préférences');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleEmail(next: boolean) {
    setSaving(true);
    setError(null);
    const previous = emailEnabled;
    setEmailEnabled(next);
    try {
      const data = await fetchJson<{ emailNotificationsEnabled: boolean }>(
        '/api/notifications/preferences',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailNotificationsEnabled: next }),
        },
      );
      setEmailEnabled(data.emailNotificationsEnabled);
    } catch (err) {
      setEmailEnabled(previous);
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ops-form">
      <SettingsFormSection
        title="Notifications dans Eveider"
        description="Toujours actives pour l’activité importante de la plateforme."
      >
        <p style={{ margin: 0, color: colors.textMuted, fontSize: 14 }}>
          Les alertes opérationnelles apparaissent dans la cloche du bandeau. Elles ne peuvent pas
          être désactivées.
        </p>
      </SettingsFormSection>

      <SettingsFormSection
        title="Notifications par e-mail"
        description="Recevoir aussi les alertes importantes (incidents, retours, vérifications) par e-mail."
      >
        {loading ? (
          <p style={{ margin: 0, color: colors.textMuted }}>Chargement…</p>
        ) : (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              cursor: saving ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={emailEnabled}
              disabled={saving}
              onChange={(event) => void toggleEmail(event.target.checked)}
            />
            {emailEnabled ? 'Activées' : 'Désactivées'}
          </label>
        )}
        {error ? (
          <p style={{ margin: '0.75rem 0 0', color: '#C43C2C', fontSize: 13 }}>{error}</p>
        ) : null}
        <p style={{ margin: '0.75rem 0 0', color: colors.textMuted, fontSize: 13 }}>
          Les e-mails de sécurité et d’invitation restent indépendants de ce réglage.
        </p>
      </SettingsFormSection>
    </div>
  );
}
