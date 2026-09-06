'use client';

import { colors, spacing } from '@eveider/config-ui';
import { Button, Card, CardHeader, InlineAlert } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DriverDetail } from '@/server/drivers';

type AdminDriverDocumentsProps = {
  driver: DriverDetail;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: spacing[4],
        flexWrap: 'wrap',
        padding: `${spacing[3]}px 0`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <span style={{ color: colors.textMuted }}>{label}</span>
      <span style={{ color: colors.secondary }}>{children}</span>
    </div>
  );
}

export function AdminDriverDocuments({ driver }: AdminDriverDocumentsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body?: unknown, okMessage?: string) {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        setError(result.error ?? 'Action impossible');
        return;
      }
      if (okMessage) setSuccess(okMessage);
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  }

  async function setBlocked(isBlocked: boolean) {
    if (!driver.userId) {
      setError('Aucun compte utilisateur lié à ce dossier.');
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/users/${driver.userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        setError(result.error ?? 'Action impossible');
        return;
      }
      setSuccess(isBlocked ? 'Compte bloqué.' : 'Compte débloqué.');
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  }

  const isBusinessDriver = driver.contractorType === 'business';

  return (
    <div style={{ display: 'grid', gap: spacing[5] }}>
      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <Card>
        <CardHeader
          title={isBusinessDriver ? 'Dossier chauffeur' : 'Contrôle des pièces'}
          description={
            isBusinessDriver
              ? 'Pièces transmises par l’entreprise — consultables ici. Pas de validation requise avant livraison.'
              : 'Vérifiez la pièce avant d’attribuer des livraisons.'
          }
        />
        <Row label="Entreprise">{driver.organizationLabel}</Row>
        <Row label="Statut">{driver.dossierStatusLabel}</Row>
        <Row label="Invitation sur le téléphone">{driver.invitedAt ? 'Envoyée' : 'Non envoyée'}</Row>
        <Row label="Compte">{driver.isBlocked ? 'Bloqué' : 'Autorisé'}</Row>
        {driver.reviewNotes ? <Row label="Notes">{driver.reviewNotes}</Row> : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4] }}>
          {!isBusinessDriver && driver.dossierStatus === 'pending_review' ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void post(
                    `/api/admin/driver-dossiers/${driver.id}/review`,
                    { status: 'approved' },
                    'Dossier approuvé.',
                  )
                }
              >
                Approuver
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void post(
                    `/api/admin/driver-dossiers/${driver.id}/review`,
                    { status: 'needs_correction' },
                    'Correction demandée.',
                  )
                }
              >
                Corriger
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void post(
                    `/api/admin/driver-dossiers/${driver.id}/review`,
                    { status: 'rejected' },
                    'Dossier rejeté.',
                  )
                }
              >
                Rejeter
              </Button>
            </>
          ) : null}
          {driver.dossierStatus === 'approved' ||
          (!isBusinessDriver && driver.dossierStatus === 'pending_review' && !driver.invitedAt) ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void post(`/api/admin/driver-dossiers/${driver.id}/invite`, undefined, 'Invitation envoyée.')
              }
            >
              Inviter
            </Button>
          ) : null}
          {driver.dossierStatus === 'deactivated' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void post(
                  `/api/admin/driver-dossiers/${driver.id}/reactivate`,
                  undefined,
                  'Compte réactivé.',
                )
              }
            >
              Réactiver
            </Button>
          ) : null}
          {driver.userId ? (
            <Button
              size="sm"
              variant={driver.isBlocked ? 'secondary' : 'danger'}
              disabled={busy}
              onClick={() => void setBlocked(!driver.isBlocked)}
            >
              {driver.isBlocked ? 'Débloquer' : 'Bloquer'}
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Documents chauffeur" />
        <Row label="Pièce d’identité">
          <a href={driver.idDocumentUrl} target="_blank" rel="noreferrer" className="nb-data-table__link">
            Voir le document
          </a>
        </Row>
        <Row label="Documents véhicule">
          <span style={{ color: colors.textMuted }}>—</span>
        </Row>
      </Card>
    </div>
  );
}
