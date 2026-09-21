'use client';

import { canInviteDriverDossier } from '@eveider/domain';
import { colors, spacing } from '@eveider/config-ui';
import { Button, Card, CardHeader, InlineAlert } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IdentityDocumentPanel } from '@/components/identity-document-panel';
import {
  inviteCooldownButtonLabel,
  useInviteCooldowns,
} from '@/lib/invite-cooldown';
import type { DriverDetail, DriverVehicleDocumentView } from '@/server/drivers';

type AdminDriverDocumentsProps = {
  driver: DriverDetail;
  vehicleDocuments?: DriverVehicleDocumentView[];
};

type BusyAction = 'approve' | 'correct' | 'reject' | 'invite' | 'reactivate' | 'block';

type ApiResult = {
  success: boolean;
  error?: string;
  data?: { delivered?: 'email' | 'simulated' };
};

function flashStorageKey(driverId: string) {
  return `eveider:driver-docs-flash:${driverId}`;
}

async function readApiResult(response: Response): Promise<ApiResult> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return { success: false, error: 'Action impossible' };
  }
}

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

export function AdminDriverDocuments({
  driver,
  vehicleDocuments = [],
}: AdminDriverDocumentsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const busy = busyAction !== null;
  const inviteCooldown = useInviteCooldowns('driver');
  const inviteRemainingMs = inviteCooldown.remainingMs(driver.id);
  const inviteCooling = inviteRemainingMs > 0;

  useEffect(() => {
    const raw = sessionStorage.getItem(flashStorageKey(driver.id));
    if (!raw) return;
    sessionStorage.removeItem(flashStorageKey(driver.id));
    try {
      const parsed = JSON.parse(raw) as { kind: 'success' | 'error'; message: string };
      if (!parsed.message) return;
      if (parsed.kind === 'success') setSuccess(parsed.message);
      else setError(parsed.message);
    } catch {
      /* ignore malformed flash */
    }
  }, [driver.id]);

  function showSuccess(message: string, refresh: boolean) {
    setSuccess(message);
    if (!refresh) return;
    sessionStorage.setItem(
      flashStorageKey(driver.id),
      JSON.stringify({ kind: 'success', message }),
    );
    router.refresh();
  }

  async function post(
    action: BusyAction,
    url: string,
    body?: unknown,
    okMessage?: string,
  ) {
    setError(null);
    setSuccess(null);
    setBusyAction(action);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await readApiResult(response);
      if (!result.success) {
        setError(result.error ?? 'Action impossible');
        return;
      }
      if (okMessage) showSuccess(okMessage, true);
      else router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setBusyAction(null);
    }
  }

  async function inviteDriver() {
    if (!inviteCooldown.guard(driver.id)) return;
    const alreadyInvited = Boolean(driver.invitedAt);
    setError(null);
    setSuccess(null);
    setBusyAction('invite');
    try {
      const response = await fetch(`/api/admin/driver-dossiers/${driver.id}/invite`, {
        method: 'POST',
      });
      const result = await readApiResult(response);
      if (!result.success) {
        setError(result.error ?? 'Impossible d’envoyer l’invitation');
        return;
      }
      inviteCooldown.start(driver.id);
      if (!alreadyInvited) router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setBusyAction(null);
    }
  }

  async function setBlocked(isBlocked: boolean) {
    if (!driver.userId) {
      setError('Aucun compte utilisateur lié à ce dossier.');
      return;
    }
    setError(null);
    setSuccess(null);
    setBusyAction('block');
    try {
      const response = await fetch(`/api/users/${driver.userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked }),
      });
      const result = await readApiResult(response);
      if (!result.success) {
        setError(result.error ?? 'Action impossible');
        return;
      }
      showSuccess(isBlocked ? 'Compte bloqué.' : 'Compte débloqué.', true);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setBusyAction(null);
    }
  }

  const isBusinessDriver = driver.contractorType === 'business';
  const needsReview = driver.dossierStatus === 'pending_review';
  const canInvite = canInviteDriverDossier(driver.dossierStatus, driver.contractorType);

  return (
    <div style={{ display: 'grid', gap: spacing[5] }}>
      {inviteCooldown.waitMessage ? (
        <InlineAlert message={inviteCooldown.waitMessage} variant="info" autoDismissMs={0} />
      ) : error ? (
        <InlineAlert message={error} variant="error" />
      ) : success ? (
        <InlineAlert message={success} variant="success" />
      ) : null}

      <Card>
        <CardHeader
          title={isBusinessDriver ? 'Dossier chauffeur' : 'Chauffeur Eveider'}
          description={
            isBusinessDriver
              ? 'Pièces transmises par l’entreprise. L’invitation ne part qu’après approbation Eveider.'
              : 'Ajouté par Eveider — l’invitation part tout de suite, sans contrôle des pièces.'
          }
        />
        <Row label="Entreprise">{driver.organizationLabel}</Row>
        <Row label="Statut">{driver.dossierStatusLabel}</Row>
        <Row label="Invitation">{driver.invitedAt ? 'Envoyée' : 'Non envoyée'}</Row>
        <Row label="Compte">{driver.isBlocked ? 'Bloqué' : 'Autorisé'}</Row>
        {driver.reviewNotes ? <Row label="Notes">{driver.reviewNotes}</Row> : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4] }}>
          {needsReview ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                loading={busyAction === 'approve'}
                onClick={() =>
                  void post(
                    'approve',
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
                loading={busyAction === 'correct'}
                onClick={() =>
                  void post(
                    'correct',
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
                loading={busyAction === 'reject'}
                onClick={() =>
                  void post(
                    'reject',
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
          {canInvite ? (
            <Button
              size="sm"
              disabled={busy || inviteCooling}
              loading={busyAction === 'invite'}
              aria-disabled={inviteCooling || busy || undefined}
              onClick={() => void inviteDriver()}
            >
              {busyAction === 'invite'
                ? 'Envoi…'
                : inviteCooldownButtonLabel(
                    driver.invitedAt ? 'Renvoyer l’invitation' : 'Inviter',
                    inviteRemainingMs,
                  )}
            </Button>
          ) : null}
          {driver.dossierStatus === 'deactivated' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              loading={busyAction === 'reactivate'}
              onClick={() =>
                void post(
                  'reactivate',
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
              loading={busyAction === 'block'}
              onClick={() => void setBlocked(!driver.isBlocked)}
            >
              {driver.isBlocked ? 'Débloquer' : 'Bloquer'}
            </Button>
          ) : null}
        </div>
      </Card>

      <IdentityDocumentPanel
        storedRef={driver.idDocumentUrl}
        ownerName={driver.fullName}
        vehicleDocuments={vehicleDocuments}
        onUploadVehicle={async (files) => {
          setError(null);
          setSuccess(null);
          const payload = new FormData();
          for (const file of files) payload.append('vehicleDocument', file);
          const response = await fetch(
            `/api/admin/driver-dossiers/${driver.id}/vehicle-documents`,
            { method: 'POST', body: payload },
          );
          const result = await readApiResult(response);
          if (!result.success) {
            throw new Error(result.error ?? 'Impossible d’ajouter le document');
          }
          showSuccess(
            files.length > 1 ? 'Documents véhicule ajoutés.' : 'Document véhicule ajouté.',
            true,
          );
        }}
        onRemoveVehicle={async (documentId) => {
          setError(null);
          setSuccess(null);
          const response = await fetch(
            `/api/admin/driver-dossiers/${driver.id}/vehicle-documents/${documentId}`,
            { method: 'DELETE' },
          );
          const result = await readApiResult(response);
          if (!result.success) {
            throw new Error(result.error ?? 'Impossible de retirer le document');
          }
          showSuccess('Document véhicule retiré.', true);
        }}
        onError={(message) => {
          setSuccess(null);
          setError(message);
        }}
        onSuccess={(message) => {
          setError(null);
          setSuccess(message);
        }}
      />
    </div>
  );
}
