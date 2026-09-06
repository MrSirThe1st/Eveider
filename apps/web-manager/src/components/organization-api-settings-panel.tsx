'use client';

import { colors, spacing, typography, webCardStyle } from '@eveider/config-ui';
import { Button, ConfirmDialog, EmptyState, IconLock, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  OrganizationApiEndpointView,
  OrganizationApiKeyView,
} from '@/server/organization-api';

type OrganizationApiSettingsPanelProps = {
  apiAccessEnabled: boolean;
  keys: OrganizationApiKeyView[];
  endpoint: OrganizationApiEndpointView | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return 'Jamais';
  return new Intl.DateTimeFormat('fr-CD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function OrganizationApiSettingsPanel({
  apiAccessEnabled,
  keys,
  endpoint,
}: OrganizationApiSettingsPanelProps) {
  const router = useRouter();
  const [keyName, setKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [notificationUrl, setNotificationUrl] = useState(endpoint?.url ?? '');
  const [signingSecret, setSigningSecret] = useState(endpoint?.signingSecret ?? null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [testing, setTesting] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  if (!apiAccessEnabled) {
    return (
      <div style={{ ...webCardStyle, padding: spacing[5] }}>
        <h2 style={{ margin: 0, ...typography.sectionTitle }}>Connexion à un logiciel</h2>
        <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
          Eveider doit activer « Connecter un logiciel » pour votre entreprise avant que vous
          puissiez créer une clé d’accès ou recevoir des notifications.
        </p>
      </div>
    );
  }

  async function createKey() {
    setError(null);
    setSuccess(null);
    setCreating(true);
    try {
      const response = await fetch('/api/organisation/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() || undefined }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(typeof result.error === 'string' ? result.error : 'Impossible de créer la clé.');
        return;
      }
      setRevealedKey(result.data.plaintext);
      setKeyName('');
      setSuccess('Copiez la clé maintenant — elle ne sera plus affichée.');
      router.refresh();
    } catch {
      setError('Impossible de créer la clé.');
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    setError(null);
    try {
      const response = await fetch(`/api/organisation/api/keys/${revokeId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(typeof result.error === 'string' ? result.error : 'Impossible de révoquer la clé.');
        return;
      }
      setRevokeId(null);
      setSuccess('Clé révoquée.');
      router.refresh();
    } catch {
      setError('Impossible de révoquer la clé.');
    } finally {
      setRevoking(false);
    }
  }

  async function saveNotificationUrl() {
    setError(null);
    setSuccess(null);
    setSavingUrl(true);
    try {
      const response = await fetch('/api/organisation/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: notificationUrl.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(
          typeof result.error === 'string' ? result.error : 'Impossible d’enregistrer l’adresse.',
        );
        return;
      }
      setSigningSecret(result.data.endpoint.signingSecret);
      setSuccess('Adresse enregistrée.');
      router.refresh();
    } catch {
      setError('Impossible d’enregistrer l’adresse.');
    } finally {
      setSavingUrl(false);
    }
  }

  async function sendTest() {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const response = await fetch('/api/organisation/api/notifications/test', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(typeof result.error === 'string' ? result.error : 'L’essai n’a pas abouti.');
        return;
      }
      setSuccess('Essai envoyé.');
    } catch {
      setError('L’essai n’a pas abouti.');
    } finally {
      setTesting(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess('Copié.');
    } catch {
      setError('Impossible de copier.');
    }
  }

  const activeKeys = keys.filter((key) => !key.revokedAt);
  const revokedKeys = keys.filter((key) => key.revokedAt);

  return (
    <section style={{ display: 'grid', gap: spacing[4] }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
        <div>
          <h2 style={{ margin: 0, ...typography.sectionTitle }}>Clé d’accès</h2>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            Votre logiciel envoie cette clé dans l’en-tête d’autorisation pour créer et lire vos
            colis.
          </p>
        </div>

        {revealedKey ? (
          <div
            style={{
              display: 'grid',
              gap: spacing[2],
              padding: spacing[3],
              background: colors.surfaceSubtle,
              borderRadius: 8,
            }}
          >
            <p style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {revealedKey}
            </p>
            <div>
              <Button variant="secondary" size="sm" onClick={() => void copyText(revealedKey)}>
                Copier la clé
              </Button>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <TextField
              id="org-api-key-name"
              label="Nom (facultatif)"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Clé principale"
            />
          </div>
          <Button variant="primary" onClick={() => void createKey()} disabled={creating}>
            {creating ? 'Création…' : 'Créer une clé'}
          </Button>
        </div>

        {activeKeys.length === 0 && !revealedKey ? (
          <EmptyState
            compact
            title="Aucune clé active"
            description="Créez une clé API pour connecter vos systèmes à Eveider."
            icon={<IconLock />}
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing[2] }}>
            {activeKeys.map((key) => (
              <li
                key={key.id}
                style={{
                  display: 'flex',
                  gap: spacing[3],
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: `${spacing[2]}px 0`,
                  borderTop: `1px solid ${colors.border}`,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{key.name}</p>
                  <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted }}>
                    {key.keyPrefix}… · Dernier usage : {formatWhen(key.lastUsedAt)}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setRevokeId(key.id)}>
                  Révoquer
                </Button>
              </li>
            ))}
          </ul>
        )}

        {revokedKeys.length > 0 ? (
          <p style={{ margin: 0, color: colors.textMuted, fontSize: 13 }}>
            {revokedKeys.length} clé{revokedKeys.length > 1 ? 's' : ''} révoquée
            {revokedKeys.length > 1 ? 's' : ''}.
          </p>
        ) : null}
      </div>

      <div style={{ ...webCardStyle, padding: spacing[5], display: 'grid', gap: spacing[3] }}>
        <div>
          <h2 style={{ margin: 0, ...typography.sectionTitle }}>Adresse de notification</h2>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textMuted }}>
            Eveider envoie un message à cette adresse quand un colis change d’étape. Le secret de
            signature permet à votre logiciel de vérifier que le message vient bien d’Eveider.
          </p>
        </div>

        <TextField
          id="org-api-notification-url"
          label="Adresse"
          value={notificationUrl}
          onChange={(event) => setNotificationUrl(event.target.value)}
          placeholder="https://"
          hint="Doit commencer par https://"
        />

        {signingSecret ? (
          <div style={{ display: 'grid', gap: spacing[2] }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Secret de signature</p>
            <p style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {signingSecret}
            </p>
            <div>
              <Button variant="secondary" size="sm" onClick={() => void copyText(signingSecret)}>
                Copier le secret
              </Button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: colors.textMuted }}>
            Enregistrez une adresse pour recevoir le secret de signature.
          </p>
        )}

        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => void saveNotificationUrl()} disabled={savingUrl}>
            {savingUrl ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void sendTest()}
            disabled={testing || !notificationUrl.trim()}
          >
            {testing ? 'Envoi…' : 'Envoyer un essai'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={revokeId != null}
        onClose={() => setRevokeId(null)}
        onConfirm={() => void confirmRevoke()}
        title="Révoquer cette clé ?"
        description="Le logiciel qui l’utilise ne pourra plus se connecter."
        confirmLabel="Révoquer"
        tone="danger"
        loading={revoking}
      />
    </section>
  );
}
