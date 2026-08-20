'use client';

import type { AdminReviewDecisionInput } from '@eveider/api-contracts';
import {
  colors,
  radius,
  spacing,
  typography,
  webInputStyle,
} from '@eveider/config-ui';
import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';
import { Button, ConfirmDialog, StatusBadge } from '@eveider/ui';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { BusinessApplicationDetail } from '@/server/business-applications';
import { BusinessStatusBadge } from './business-status-badge';
import { KycDocumentPreview } from './kyc-document-preview';
import {
  CHECK_FAIL_REASONS,
  CHECK_ITEMS,
  type CheckKey,
  type CheckStatusValue,
  DOC_CORRECTION_REASONS,
  DOCUMENT_TYPE_LABELS,
  REVIEW_STEPS,
  computeConfidenceScore,
  confidenceTone,
  formatFailNote,
} from './kyc-review-constants';

type DocReviewStatus = 'approved' | 'rejected' | 'correction_requested' | 'pending';
type CheckEntry = NonNullable<AdminReviewDecisionInput['checks']>[number];
type ApplicationDocument = BusinessApplicationDetail['documents'][number];
type ApplicationLocation = BusinessApplicationDetail['locations'][number];

type FailMeta = { reasonCode: string; comment: string };
type DocFailMeta = { reasonCode: string; comment: string };

interface AdminApplicationReviewProps {
  business: BusinessApplicationDetail;
  nextApplicationId?: string | null;
  /** When true, skip outer max-width / title (provided by PageFrame). */
  hidePageChrome?: boolean;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr)',
        gap: spacing[3],
        alignItems: 'baseline',
        padding: `${spacing[2]}px 0`,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <dt
        style={{
          margin: 0,
          fontSize: typography.overline.fontSize,
          fontWeight: typography.overline.fontWeight,
          letterSpacing: typography.overline.letterSpacing,
          textTransform: 'uppercase',
          color: colors.textMuted,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: typography.bodySm.fontSize,
          fontWeight: typography.weights.semibold,
          color: colors.secondary,
          lineHeight: 1.45,
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function PanelHeading({
  icon,
  eyebrow,
  children,
  meta,
}: {
  icon: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: spacing[4],
        marginBottom: spacing[5],
        paddingBottom: spacing[4],
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div>
        {eyebrow ? (
          <div
            style={{
              fontSize: typography.overline.fontSize,
              fontWeight: typography.overline.fontWeight,
              letterSpacing: typography.overline.letterSpacing,
              textTransform: 'uppercase',
              color: colors.textMuted,
              marginBottom: spacing[1],
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h3
          style={{
            margin: 0,
            fontSize: typography.sectionTitle.fontSize,
            fontWeight: typography.sectionTitle.fontWeight,
            letterSpacing: typography.sectionTitle.letterSpacing,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            color: colors.secondary,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: colors.surfaceMuted,
              color: colors.textMuted,
            }}
          >
            {icon}
          </span>
          {children}
        </h3>
      </div>
      {meta ? <div style={{ flexShrink: 0 }}>{meta}</div> : null}
    </div>
  );
}

function Workspace({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: radius.lg,
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function checkToggleStyle(
  kind: 'PASS' | 'FAIL',
  current: CheckStatusValue,
): CSSProperties {
  const selected = current === kind;
  const pending = current === 'PENDING';

  if (kind === 'PASS') {
    if (selected) {
      return {
        minWidth: 72,
        padding: '0.45rem 0.85rem',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: '0.6875rem',
        letterSpacing: '0.04em',
        border: `1px solid #C0EAB7`,
        background: colors.successMuted,
        color: '#067A07',
        cursor: 'pointer',
      };
    }
    return {
      minWidth: 72,
      padding: '0.45rem 0.85rem',
      borderRadius: 8,
      fontWeight: 600,
      fontSize: '0.6875rem',
      letterSpacing: '0.04em',
      border: pending ? `1px dashed ${colors.border}` : `1px solid ${colors.borderSubtle}`,
      background: pending ? colors.surfaceSubtle : 'transparent',
      color: pending ? colors.textMuted : colors.textDisabled,
      cursor: 'pointer',
    };
  }

  if (selected) {
    return {
      minWidth: 72,
      padding: '0.45rem 0.85rem',
      borderRadius: 8,
      fontWeight: 700,
      fontSize: '0.6875rem',
      letterSpacing: '0.04em',
      border: `1px solid #F5C2C0`,
      background: colors.dangerMuted,
      color: colors.danger,
      cursor: 'pointer',
    };
  }
  return {
    minWidth: 72,
    padding: '0.45rem 0.85rem',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.6875rem',
    letterSpacing: '0.04em',
    border: pending ? `1px dashed ${colors.border}` : `1px solid ${colors.borderSubtle}`,
    background: pending ? colors.surfaceSubtle : 'transparent',
    color: pending ? colors.textMuted : colors.textDisabled,
    cursor: 'pointer',
  };
}

function parseExistingFail(notes: string | null | undefined): FailMeta {
  if (!notes?.trim()) return { reasonCode: '', comment: '' };
  return { reasonCode: '__custom__', comment: notes };
}

export function AdminApplicationReview({
  business,
  nextApplicationId = null,
  hidePageChrome = false,
}: AdminApplicationReviewProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<'approve' | 'request_correction' | 'block' | null>(
    null,
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [noDocsAcknowledged, setNoDocsAcknowledged] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApplicationDocument | null>(null);
  const [pendingAction, setPendingAction] = useState<'approve' | 'request_correction' | 'block' | null>(
    null,
  );

  const latestVerification = business.verifications?.[0];
  const initialChecks = latestVerification?.checks ?? [];
  const hasDocuments = (business.documents?.length ?? 0) > 0;

  const getCheckStatus = (type: string): CheckStatusValue => {
    const status = initialChecks.find((c) => c.type === type)?.status;
    if (status === 'PASS' || status === 'FAIL' || status === 'PENDING') return status;
    return 'PENDING';
  };

  const [checks, setChecks] = useState<Record<CheckKey, CheckStatusValue>>({
    PHONE_VERIFIED: business.isPhoneVerified ? 'PASS' : getCheckStatus('PHONE_VERIFIED'),
    IDENTITY_MATCHED: getCheckStatus('IDENTITY_MATCHED'),
    DOCUMENT_VALID: getCheckStatus('DOCUMENT_VALID'),
    ADDRESS_CONFIRMED: getCheckStatus('ADDRESS_CONFIRMED'),
    COMPANY_REGISTERED: getCheckStatus('COMPANY_REGISTERED'),
    BANK_ACCOUNT_VERIFIED: getCheckStatus('BANK_ACCOUNT_VERIFIED'),
  });

  const [failMeta, setFailMeta] = useState<Record<CheckKey, FailMeta>>(() => {
    const initial = {} as Record<CheckKey, FailMeta>;
    for (const item of CHECK_ITEMS) {
      const existing = initialChecks.find((c) => c.type === item.key);
      initial[item.key] =
        existing?.status === 'FAIL' ? parseExistingFail(existing.notes) : { reasonCode: '', comment: '' };
    }
    return initial;
  });

  const [docStatuses, setDocStatuses] = useState<Record<string, DocReviewStatus>>(() =>
    (business.documents ?? []).reduce<Record<string, DocReviewStatus>>((acc, doc) => {
      if (doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'correction_requested') {
        acc[doc.id] = doc.status;
      } else {
        acc[doc.id] = 'pending';
      }
      return acc;
    }, {}),
  );

  const [docFailMeta, setDocFailMeta] = useState<Record<string, DocFailMeta>>(() =>
    (business.documents ?? []).reduce<Record<string, DocFailMeta>>((acc, doc) => {
      acc[doc.id] =
        doc.status === 'correction_requested' || doc.status === 'rejected'
          ? parseExistingFail(doc.notes)
          : { reasonCode: '', comment: '' };
      return acc;
    }, {}),
  );

  const confidence = useMemo(
    () =>
      computeConfidenceScore({
        isPhoneVerified: business.isPhoneVerified,
        documentCount: business.documents?.length ?? 0,
        checks,
        docStatuses,
      }),
    [business.isPhoneVerified, business.documents?.length, checks, docStatuses],
  );

  const softWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!business.isPhoneVerified && checks.PHONE_VERIFIED === 'PASS') {
      warnings.push('Téléphone marqué PASS alors que le OTP n’est pas vérifié côté système.');
    }
    if (!hasDocuments && checks.DOCUMENT_VALID === 'PASS') {
      warnings.push('Aucun document fourni, mais « Documents valides » est en PASS.');
    }
    if (checks.ADDRESS_CONFIRMED === 'PASS') {
      const pickup = business.locations?.find((l) => l.type === 'pickup_point');
      if (!pickup?.street) {
        warnings.push('Adresse d’enlèvement absente — confirmation basée sur un jugement humain.');
      } else {
        warnings.push('Adresse confirmée manuellement (pas de vérification terrain automatique).');
      }
    }
    if (checks.BANK_ACCOUNT_VERIFIED === 'PASS') {
      warnings.push('Coordonnées bancaires / Mobile Money non croisées automatiquement.');
    }
    return warnings;
  }, [business.isPhoneVerified, business.locations, checks, hasDocuments]);

  const allChecksDecided = CHECK_ITEMS.every((item) => checks[item.key] !== 'PENDING');
  const allFailsHaveReasons = CHECK_ITEMS.every((item) => {
    if (checks[item.key] !== 'FAIL') return true;
    const meta = failMeta[item.key];
    if (!meta.reasonCode) return false;
    if (meta.reasonCode === '__custom__') return Boolean(meta.comment.trim());
    return true;
  });
  const allDocsReviewed =
    !hasDocuments ||
    (business.documents ?? []).every((doc) => docStatuses[doc.id] && docStatuses[doc.id] !== 'pending');
  const allDocFailsHaveReasons = (business.documents ?? []).every((doc) => {
    const status = docStatuses[doc.id];
    if (status !== 'correction_requested' && status !== 'rejected') return true;
    const meta = docFailMeta[doc.id];
    if (!meta?.reasonCode) return false;
    if (meta.reasonCode === '__custom__') return Boolean(meta.comment.trim());
    return true;
  });

  const canLeaveStep2 = allChecksDecided && allFailsHaveReasons;
  const canLeaveStep3 = allDocsReviewed && allDocFailsHaveReasons;
  const needsNoDocsAck = !hasDocuments;
  const canDecide =
    canLeaveStep2 &&
    canLeaveStep3 &&
    (!needsNoDocsAck || noDocsAcknowledged || successAction != null);

  const structuredIssues = useMemo(() => {
    const issues: string[] = [];
    for (const item of CHECK_ITEMS) {
      if (checks[item.key] !== 'FAIL') continue;
      const meta = failMeta[item.key];
      const reason =
        meta.reasonCode === '__custom__'
          ? meta.comment.trim()
          : CHECK_FAIL_REASONS[item.key].find((r) => r.code === meta.reasonCode)?.label ?? meta.comment;
      const note = formatFailNote(reason || 'Motif non précisé', meta.reasonCode === '__custom__' ? '' : meta.comment);
      issues.push(`❌ ${item.label}\n→ "${note}"`);
    }
    for (const doc of business.documents ?? []) {
      const status = docStatuses[doc.id];
      if (status !== 'correction_requested' && status !== 'rejected') continue;
      const meta = docFailMeta[doc.id];
      const reason =
        meta?.reasonCode === '__custom__'
          ? meta.comment.trim()
          : DOC_CORRECTION_REASONS.find((r) => r.code === meta?.reasonCode)?.label ?? meta?.comment;
      const label = DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type;
      const note = formatFailNote(reason || 'Motif non précisé', meta?.reasonCode === '__custom__' ? '' : meta?.comment);
      issues.push(`❌ ${label}\n→ "${note}"`);
    }
    return issues;
  }, [business.documents, checks, docFailMeta, docStatuses, failMeta]);

  function buildStructuredReviewNotes(action: 'approve' | 'request_correction' | 'block'): string {
    const parts: string[] = [];
    if (action === 'request_correction' && structuredIssues.length > 0) {
      parts.push('Corrections requises :');
      parts.push(...structuredIssues);
    }
    if (action === 'block' && structuredIssues.length > 0) {
      parts.push('Motifs de rejet :');
      parts.push(...structuredIssues);
    }
    if (!hasDocuments && action === 'approve') {
      parts.push('⚠ Approuvé sans documents justificatifs (accusé par l’administrateur).');
    }
    if (reviewNotes.trim()) {
      if (parts.length) parts.push('');
      parts.push(`Remarque : ${reviewNotes.trim()}`);
    }
    return parts.join('\n');
  }

  function resolveCheckNotes(key: CheckKey): string | undefined {
    if (checks[key] !== 'FAIL') return undefined;
    const meta = failMeta[key];
    if (meta.reasonCode === '__custom__') return meta.comment.trim() || undefined;
    const label = CHECK_FAIL_REASONS[key].find((r) => r.code === meta.reasonCode)?.label ?? '';
    return formatFailNote(label, meta.comment) || undefined;
  }

  function resolveDocNotes(docId: string): string | undefined {
    const status = docStatuses[docId];
    if (status !== 'correction_requested' && status !== 'rejected') return undefined;
    const meta = docFailMeta[docId];
    if (!meta) return undefined;
    if (meta.reasonCode === '__custom__') return meta.comment.trim() || undefined;
    const label = DOC_CORRECTION_REASONS.find((r) => r.code === meta.reasonCode)?.label ?? '';
    return formatFailNote(label, meta.comment) || undefined;
  }

  async function handleDecision(action: 'approve' | 'request_correction' | 'block') {
    if (!canDecide && action !== 'block') {
      setError('Complétez la checklist, les motifs FAIL et la revue documents avant de décider.');
      setStep(canLeaveStep2 ? (canLeaveStep3 ? 4 : 3) : 2);
      setPendingAction(null);
      return;
    }
    if (action === 'block' && !allFailsHaveReasons && structuredIssues.length === 0 && !reviewNotes.trim()) {
      setError('Indiquez au moins un motif (FAIL + raison ou remarque) avant de bloquer.');
      setPendingAction(null);
      return;
    }
    if (action === 'request_correction' && structuredIssues.length === 0 && !reviewNotes.trim()) {
      setError('Ajoutez des motifs structurés (FAIL ou documents) avant de demander une correction.');
      setStep(2);
      setPendingAction(null);
      return;
    }
    if (needsNoDocsAck && !noDocsAcknowledged && action === 'approve') {
      setError('Confirmez l’absence de documents avant d’approuver.');
      setStep(4);
      setPendingAction(null);
      return;
    }

    setLoading(true);
    setError(null);

    const checksPayload: NonNullable<AdminReviewDecisionInput['checks']> = Object.entries(checks).map(
      ([type, status]) => ({
        type: type as CheckEntry['type'],
        status,
        notes: resolveCheckNotes(type as CheckKey),
      }),
    );

    const docsPayload = Object.entries(docStatuses)
      .filter(([, status]) => status !== 'pending')
      .map(([documentId, status]) => ({
        documentId,
        status: status as 'approved' | 'rejected' | 'correction_requested',
        notes: resolveDocNotes(documentId),
      }));

    try {
      const res = await fetch(`/api/businesses/${business.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes: buildStructuredReviewNotes(action),
          checks: checksPayload,
          documentsFeedback: docsPayload,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        setError(result.error ?? 'Traitement de la décision échoué');
        return;
      }

      setPendingAction(null);
      setSuccessAction(action);
    } catch {
      setError('Erreur réseau lors de la soumission de la décision.');
    } finally {
      setLoading(false);
    }
  }

  function requestDecision(action: 'approve' | 'request_correction' | 'block') {
    setError(null);

    if (!canDecide && action !== 'block') {
      setError('Complétez la checklist, les motifs FAIL et la revue documents avant de décider.');
      setStep(canLeaveStep2 ? (canLeaveStep3 ? 4 : 3) : 2);
      return;
    }
    if (action === 'block' && !allFailsHaveReasons && structuredIssues.length === 0 && !reviewNotes.trim()) {
      setError('Indiquez au moins un motif (FAIL + raison ou remarque) avant de bloquer.');
      return;
    }
    if (action === 'request_correction' && structuredIssues.length === 0 && !reviewNotes.trim()) {
      setError('Ajoutez des motifs structurés (FAIL ou documents) avant de demander une correction.');
      setStep(2);
      return;
    }
    if (needsNoDocsAck && !noDocsAcknowledged && action === 'approve') {
      setError('Confirmez l’absence de documents avant d’approuver.');
      setStep(4);
      return;
    }

    setPendingAction(action);
  }

  const confirmCopy =
    pendingAction === 'approve'
      ? {
          title: 'Confirmer l’approbation ?',
          description: `Vous allez activer le compte business « ${business.name} ». Cette action est irréversible depuis cet écran.`,
          confirmLabel: 'Oui, approuver',
          tone: 'default' as const,
        }
      : pendingAction === 'request_correction'
        ? {
            title: 'Demander une correction ?',
            description: `Le marchand « ${business.name} » recevra les motifs structurés et devra soumettre à nouveau son dossier.`,
            confirmLabel: 'Oui, demander correction',
            tone: 'default' as const,
          }
        : pendingAction === 'block'
          ? {
              title: 'Rejeter et bloquer ce compte ?',
              description: `Le compte « ${business.name} » sera bloqué. Confirmez uniquement si le dossier ne peut pas être corrigé.`,
              confirmLabel: 'Oui, rejeter',
              tone: 'danger' as const,
            }
          : null;

  function goNext() {
    setError(null);
    // Steps 1–3 are free to navigate (admins need docs to evaluate checks).
    // Only Decision (step 4) requires checklist + document reviews.
    if (step === 3 && !canLeaveStep2) {
      setError('Validez tous les contrôles (PASS/FAIL) et renseignez un motif pour chaque FAIL avant la décision.');
      setStep(2);
      return;
    }
    if (step === 3 && !canLeaveStep3) {
      setError('Passez en revue chaque document (Approuver / Demander correction + motif) avant la décision.');
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function goPrev() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  const ownerUser = business.users?.[0];
  const mainAddress = business.locations?.find((l: ApplicationLocation) => l.type === 'business_address');
  const pickupPoint = business.locations?.find((l: ApplicationLocation) => l.type === 'pickup_point');
  const confTone = confidenceTone(confidence);
  const pendingChecks = CHECK_ITEMS.filter((item) => checks[item.key] === 'PENDING').length;
  const pendingDocs = hasDocuments
    ? (business.documents ?? []).filter((doc) => (docStatuses[doc.id] ?? 'pending') === 'pending').length
    : 0;

  const activityLog = useMemo(() => {
    const events: Array<{ at: string; label: string }> = [];
    events.push({
      at: business.createdAt,
      label: 'Dossier créé',
    });
    if (business.isPhoneVerified) {
      events.push({ at: business.createdAt, label: 'Téléphone vérifié' });
    }
    for (const doc of business.documents ?? []) {
      events.push({
        at: doc.createdAt,
        label: `Document déposé — ${DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}`,
      });
    }
    if (latestVerification?.submittedAt) {
      events.push({ at: latestVerification.submittedAt, label: 'Dossier soumis pour vérification' });
    }
    for (const entry of business.statusHistory ?? []) {
      const statusLabel =
        BUSINESS_STATUS_LABELS[entry.newStatus as BusinessStatus] ?? entry.newStatus;
      events.push({
        at: entry.createdAt,
        label: entry.reason?.trim()
          ? `Statut → ${statusLabel} (${entry.reason})`
          : `Statut → ${statusLabel}`,
      });
    }
    return events
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(-12);
  }, [business, latestVerification?.submittedAt]);

  const successTitle =
    successAction === 'approve'
      ? 'Compte approuvé et activé'
      : successAction === 'request_correction'
        ? 'Corrections demandées'
        : successAction === 'block'
          ? 'Compte rejeté et bloqué'
          : null;

  return (
    <div
      style={
        hidePageChrome
          ? { paddingBottom: 104 }
          : { width: '100%', padding: '0 0 7rem' }
      }
    >
      {!hidePageChrome ? (
        <Link
          href="/tableau-de-bord/entreprises/applications"
          style={{
            textDecoration: 'none',
            color: colors.secondary,
            fontWeight: 700,
            fontSize: '0.8125rem',
          }}
        >
          ← Retour aux dossiers d&apos;inscription
        </Link>
      ) : null}

      {/* Command bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          marginTop: hidePageChrome ? 0 : '1rem',
          marginBottom: spacing[4],
          background: colors.surface,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: radius.lg,
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing[4],
            flexWrap: 'wrap',
            padding: `${spacing[4]}px ${spacing[5]}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap', minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '0.3rem 0.55rem',
                background: colors.surfaceMuted,
                color: colors.textMuted,
                borderRadius: 6,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {business.id.slice(0, 8).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: typography.overline.fontSize,
                  fontWeight: typography.overline.fontWeight,
                  letterSpacing: typography.overline.letterSpacing,
                  textTransform: 'uppercase',
                  color: colors.textMuted,
                }}
              >
                Mode revue
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: colors.secondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 360,
                }}
              >
                {business.name}
              </div>
            </div>
            <BusinessStatusBadge status={business.status as BusinessStatus} />
            <StatusBadge tone={confTone} withDot>
              Confiance {confidence}%
            </StatusBadge>
          </div>
          <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
            {pendingChecks > 0 ? (
              <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 600 }}>
                {pendingChecks} contrôle{pendingChecks > 1 ? 's' : ''} en attente
              </span>
            ) : null}
            {pendingDocs > 0 ? (
              <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 600 }}>
                {pendingDocs} doc{pendingDocs > 1 ? 's' : ''} à revoir
              </span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: `1px solid ${colors.borderSubtle}`,
            background: colors.surfaceSubtle,
          }}
        >
          {REVIEW_STEPS.map((s, index) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id === 4) {
                    if (!canLeaveStep2) {
                      setError(
                        'Validez tous les contrôles (PASS/FAIL) et renseignez un motif pour chaque FAIL avant la décision.',
                      );
                      setStep(2);
                      return;
                    }
                    if (!canLeaveStep3) {
                      setError(
                        'Passez en revue chaque document (Approuver / Demander correction + motif) avant la décision.',
                      );
                      setStep(3);
                      return;
                    }
                  }
                  setError(null);
                  setStep(s.id);
                }}
                style={{
                  position: 'relative',
                  border: 'none',
                  borderRight: index < 3 ? `1px solid ${colors.borderSubtle}` : 'none',
                  background: active ? colors.surface : 'transparent',
                  color: colors.secondary,
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {active ? (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 2,
                      background: colors.secondary,
                    }}
                  />
                ) : null}
                <div
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: active ? colors.secondary : colors.textMuted,
                    marginBottom: 2,
                  }}
                >
                  {done ? '✓ ' : ''}Step {s.id}/4
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: active ? 700 : 600,
                    color: active ? colors.secondary : colors.textMuted,
                  }}
                >
                  {s.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {successAction ? (
        <div
          style={{
            background: colors.successMuted,
            border: `1px solid #C0EAB7`,
            color: '#067A07',
            padding: `${spacing[4]}px ${spacing[5]}px`,
            borderRadius: radius.md,
            marginBottom: spacing[4],
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: spacing[3] }}>✓ {successTitle}</div>
          <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
            {nextApplicationId && nextApplicationId !== business.id ? (
              <Link
                href={`/tableau-de-bord/entreprises/applications/${nextApplicationId}`}
                className="nb-btn nb-btn-primary nb-btn--sm"
                style={{ textDecoration: 'none' }}
              >
                Dossier suivant →
              </Link>
            ) : null}
            <Link
              href="/tableau-de-bord/entreprises/applications"
              className="nb-btn nb-btn-secondary nb-btn--sm"
              style={{ textDecoration: 'none' }}
            >
              Retour à la file
            </Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            background: colors.dangerMuted,
            border: `1px solid #F5C2C0`,
            color: colors.danger,
            padding: `${spacing[3]}px ${spacing[4]}px`,
            borderRadius: radius.md,
            fontWeight: 700,
            marginBottom: spacing[4],
            fontSize: typography.bodySm.fontSize,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* STEP 1 — Dossier */}
      {step === 1 ? (
        <Workspace>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.55fr) minmax(260px, 0.85fr)',
              minHeight: 420,
            }}
          >
            <div style={{ padding: `${spacing[6]}px ${spacing[6]}px ${spacing[5]}px` }}>
              <PanelHeading
                icon={<Building2 size={15} />}
                eyebrow="Étape 1 · Profil"
                meta={
                  <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted, fontWeight: 600 }}>
                    {business.documents?.length ?? 0} document{(business.documents?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                }
              >
                Dossier entreprise
              </PanelHeading>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: spacing[8],
                }}
              >
                <section>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      marginBottom: spacing[3],
                      fontSize: typography.caption.fontSize,
                      fontWeight: 700,
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Building2 size={14} /> Entreprise
                  </div>
                  <dl style={{ margin: 0 }}>
                    <InfoRow label="Nom" value={business.name} />
                    <InfoRow label="Code d'accès" value={business.accessCode ?? '—'} />
                    <InfoRow label="Risque" value={business.riskClassification ?? 'INDIVIDUAL_SELLER'} />
                    <InfoRow label="Secteur" value={business.industry ?? 'Non renseigné'} />
                    <InfoRow
                      label="Canaux"
                      value={business.salesChannels?.length ? business.salesChannels.join(', ') : 'Aucun'}
                    />
                    {business.description?.trim() ? (
                      <InfoRow label="Description" value={business.description} />
                    ) : null}
                    <InfoRow label="Légal" value={business.legalCompanyName ?? '—'} />
                    <InfoRow label="RCCM" value={business.rccmNumber ?? '—'} />
                    <InfoRow label="NIF" value={business.nifNumber ?? '—'} />
                    <InfoRow
                      label="Représentant"
                      value={business.legalRepName ?? business.individualFullName ?? '—'}
                    />
                  </dl>
                </section>

                <section>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      marginBottom: spacing[3],
                      fontSize: typography.caption.fontSize,
                      fontWeight: 700,
                      color: colors.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <User size={14} /> Propriétaire
                  </div>
                  <dl style={{ margin: 0 }}>
                    <InfoRow
                      label="Utilisateur"
                      value={`${ownerUser?.fullName ?? '—'} (${ownerUser?.userRole ?? 'owner'})`}
                    />
                    <InfoRow label="Email" value={business.contactEmail ?? ownerUser?.email ?? '—'} />
                    <InfoRow
                      label="Téléphone"
                      value={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
                          {business.contactPhone ?? ownerUser?.phone ?? '—'}
                          {business.isPhoneVerified ? (
                            <StatusBadge tone="success">Vérifié</StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Non vérifié</StatusBadge>
                          )}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Siège"
                      value={`${mainAddress?.street ?? '—'}, ${mainAddress?.city ?? 'Kinshasa'}`}
                    />
                    <InfoRow label="Enlèvement" value={pickupPoint?.pickupMethod ?? 'courier_pickup'} />
                    <InfoRow label="Dépôt" value={pickupPoint?.street ?? '—'} />
                    <InfoRow
                      label="Contact"
                      value={`${pickupPoint?.contactPerson ?? '—'} (${pickupPoint?.contactPhone ?? '—'})`}
                    />
                  </dl>
                </section>
              </div>
            </div>

            <aside
              style={{
                background: colors.surfaceSubtle,
                borderLeft: `1px solid ${colors.borderSubtle}`,
                padding: `${spacing[6]}px ${spacing[5]}px`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  marginBottom: spacing[4],
                  fontSize: typography.caption.fontSize,
                  fontWeight: 700,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <History size={14} /> Activité
              </div>
              {activityLog.length === 0 ? (
                <p style={{ margin: 0, color: colors.textMuted, fontSize: typography.bodySm.fontSize }}>
                  Aucun événement.
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: spacing[3] }}>
                  {activityLog.map((event, index) => (
                    <li
                      key={`${event.at}-${index}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '10px 1fr',
                        gap: spacing[3],
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          marginTop: 5,
                          borderRadius: '50%',
                          background: index === activityLog.length - 1 ? colors.secondary : colors.border,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: colors.textMuted,
                            marginBottom: 2,
                          }}
                        >
                          {new Date(event.at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: typography.bodySm.fontSize, fontWeight: 600, lineHeight: 1.35 }}>
                          {event.label}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </Workspace>
      ) : null}

      {/* STEP 2 — Verification */}
      {step === 2 ? (
        <Workspace>
          <div style={{ padding: `${spacing[6]}px ${spacing[6]}px ${spacing[4]}px` }}>
            <PanelHeading
              icon={<CheckCircle2 size={15} />}
              eyebrow="Étape 2 · Contrôles"
              meta={
                <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted, fontWeight: 600 }}>
                  {CHECK_ITEMS.length - pendingChecks}/{CHECK_ITEMS.length} évalués
                </span>
              }
            >
              Grille de vérification
            </PanelHeading>
            <p style={{ margin: `-${spacing[2]}px 0 ${spacing[4]}px`, fontSize: typography.bodySm.fontSize, color: colors.textMuted }}>
              Chaque FAIL exige un motif — feedback marchand + audit.
            </p>
          </div>

          <div>
            {CHECK_ITEMS.map((item, index) => {
              const status = checks[item.key];
              const meta = failMeta[item.key];
              const isPending = status === 'PENDING';
              const accent =
                status === 'PASS' ? '#86EFAC' : status === 'FAIL' ? '#FCA5A5' : colors.border;
              return (
                <div
                  key={item.key}
                  style={{
                    borderTop: index === 0 ? `1px solid ${colors.borderSubtle}` : undefined,
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    borderLeft: `3px solid ${accent}`,
                    background: isPending
                      ? colors.surface
                      : status === 'PASS'
                        ? colors.successMuted
                        : colors.dangerMuted,
                    padding: `${spacing[4]}px ${spacing[6]}px`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: spacing[4],
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap', minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: typography.bodySm.fontSize }}>{item.label}</span>
                      {isPending ? (
                        <StatusBadge tone="neutral" withDot>
                          À évaluer
                        </StatusBadge>
                      ) : status === 'PASS' ? (
                        <StatusBadge tone="success" withDot>
                          PASS
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="danger" withDot>
                          FAIL
                        </StatusBadge>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: spacing[2] }} role="group" aria-label={item.label}>
                      <button
                        type="button"
                        aria-pressed={status === 'PASS'}
                        onClick={() =>
                          setChecks((prev) => ({
                            ...prev,
                            [item.key]: prev[item.key] === 'PASS' ? 'PENDING' : 'PASS',
                          }))
                        }
                        style={checkToggleStyle('PASS', status)}
                      >
                        PASS
                      </button>
                      <button
                        type="button"
                        aria-pressed={status === 'FAIL'}
                        onClick={() =>
                          setChecks((prev) => ({
                            ...prev,
                            [item.key]: prev[item.key] === 'FAIL' ? 'PENDING' : 'FAIL',
                          }))
                        }
                        style={checkToggleStyle('FAIL', status)}
                      >
                        FAIL
                      </button>
                    </div>
                  </div>

                  {status === 'FAIL' ? (
                    <div
                      style={{
                        marginTop: spacing[3],
                        display: 'grid',
                        gap: spacing[3],
                        gridTemplateColumns: '1fr 1fr',
                      }}
                    >
                      <label style={{ display: 'grid', gap: spacing[1] }}>
                        <span style={{ fontSize: typography.caption.fontSize, fontWeight: 700 }}>Motif *</span>
                        <select
                          value={meta.reasonCode}
                          onChange={(e) =>
                            setFailMeta((prev) => ({
                              ...prev,
                              [item.key]: { ...prev[item.key], reasonCode: e.target.value },
                            }))
                          }
                          style={{ ...webInputStyle, height: 40 }}
                        >
                          <option value="">Sélectionner…</option>
                          {CHECK_FAIL_REASONS[item.key].map((reason) => (
                            <option key={reason.code} value={reason.code}>
                              {reason.label}
                            </option>
                          ))}
                          <option value="__custom__">Autre (saisie libre)</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: spacing[1] }}>
                        <span style={{ fontSize: typography.caption.fontSize, fontWeight: 700 }}>
                          Commentaire {meta.reasonCode === '__custom__' ? '*' : '(optionnel)'}
                        </span>
                        <input
                          value={meta.comment}
                          onChange={(e) =>
                            setFailMeta((prev) => ({
                              ...prev,
                              [item.key]: { ...prev[item.key], comment: e.target.value },
                            }))
                          }
                          placeholder="Précision pour le marchand…"
                          style={{ ...webInputStyle, height: 40 }}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Workspace>
      ) : null}

      {/* STEP 3 — Documents */}
      {step === 3 ? (
        <Workspace>
          <div style={{ padding: `${spacing[6]}px ${spacing[6]}px ${spacing[4]}px` }}>
            <PanelHeading
              icon={<FileText size={15} />}
              eyebrow="Étape 3 · Pièces"
              meta={
                <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted, fontWeight: 600 }}>
                  {hasDocuments
                    ? `${(business.documents?.length ?? 0) - pendingDocs}/${business.documents?.length ?? 0} revus`
                    : 'Aucun document'}
                </span>
              }
            >
              Documents
            </PanelHeading>
          </div>

          {!hasDocuments ? (
            <div
              style={{
                margin: `0 ${spacing[6]}px ${spacing[6]}px`,
                padding: spacing[6],
                borderRadius: radius.md,
                background: colors.warningMuted,
                border: `1px solid #F5D98A`,
                color: '#9A6B00',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: spacing[1] }}>Aucun document déposé</div>
              <p style={{ margin: `0 0 ${spacing[4]}px`, fontSize: typography.bodySm.fontSize }}>
                Cette entreprise n&apos;a fourni aucun document de vérification.
              </p>
              <Button variant="secondary" onClick={() => setStep(4)}>
                Continuer quand même
              </Button>
            </div>
          ) : (
            <div>
              {(business.documents ?? []).map((doc: ApplicationDocument, index) => {
                const status = docStatuses[doc.id] ?? 'pending';
                const meta = docFailMeta[doc.id] ?? { reasonCode: '', comment: '' };
                const needsReason = status === 'correction_requested' || status === 'rejected';
                const accent =
                  status === 'approved'
                    ? '#86EFAC'
                    : needsReason
                      ? '#F5D98A'
                      : colors.border;
                return (
                  <div
                    key={doc.id}
                    style={{
                      borderTop: index === 0 ? `1px solid ${colors.borderSubtle}` : undefined,
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      borderLeft: `3px solid ${accent}`,
                      padding: `${spacing[4]}px ${spacing[6]}px`,
                      background:
                        status === 'approved'
                          ? colors.successMuted
                          : needsReason
                            ? colors.warningMuted
                            : colors.surface,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: spacing[4],
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: typography.bodySm.fontSize }}>
                          {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: typography.caption.fontSize, color: colors.textMuted, marginTop: 2 }}>
                          {doc.fileName ?? 'document'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(doc)}>
                          Aperçu
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDocStatuses((prev) => ({ ...prev, [doc.id]: 'approved' }))}
                          style={checkToggleStyle('PASS', status === 'approved' ? 'PASS' : 'PENDING')}
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDocStatuses((prev) => ({ ...prev, [doc.id]: 'correction_requested' }))
                          }
                          style={{
                            minWidth: 72,
                            padding: '0.45rem 0.85rem',
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: '0.6875rem',
                            letterSpacing: '0.02em',
                            border: status === 'correction_requested' ? 'none' : `1px dashed ${colors.border}`,
                            background: status === 'correction_requested' ? colors.warning : colors.surfaceSubtle,
                            color: status === 'correction_requested' ? colors.secondary : colors.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          Correction
                        </button>
                      </div>
                    </div>

                    {needsReason ? (
                      <div
                        style={{
                          marginTop: spacing[3],
                          display: 'grid',
                          gap: spacing[3],
                          gridTemplateColumns: '1fr 1fr',
                        }}
                      >
                        <label style={{ display: 'grid', gap: spacing[1] }}>
                          <span style={{ fontSize: typography.caption.fontSize, fontWeight: 700 }}>Motif *</span>
                          <select
                            value={meta.reasonCode}
                            onChange={(e) =>
                              setDocFailMeta((prev) => ({
                                ...prev,
                                [doc.id]: {
                                  reasonCode: e.target.value,
                                  comment: prev[doc.id]?.comment ?? '',
                                },
                              }))
                            }
                            style={{ ...webInputStyle, height: 40 }}
                          >
                            <option value="">Sélectionner…</option>
                            {DOC_CORRECTION_REASONS.map((reason) => (
                              <option key={reason.code} value={reason.code}>
                                {reason.label}
                              </option>
                            ))}
                            <option value="__custom__">Autre (saisie libre)</option>
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: spacing[1] }}>
                          <span style={{ fontSize: typography.caption.fontSize, fontWeight: 700 }}>
                            Commentaire {meta.reasonCode === '__custom__' ? '*' : '(optionnel)'}
                          </span>
                          <input
                            value={meta.comment}
                            onChange={(e) =>
                              setDocFailMeta((prev) => ({
                                ...prev,
                                [doc.id]: {
                                  reasonCode: prev[doc.id]?.reasonCode ?? '',
                                  comment: e.target.value,
                                },
                              }))
                            }
                            placeholder="Précision pour le marchand…"
                            style={{ ...webInputStyle, height: 40 }}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Workspace>
      ) : null}

      {/* STEP 4 — Decision */}
      {step === 4 ? (
        <Workspace>
          <div style={{ padding: spacing[6] }}>
            <PanelHeading icon={<CheckCircle2 size={15} />} eyebrow="Étape 4 · Décision">
              Synthèse & communication
            </PanelHeading>

            <div style={{ display: 'grid', gap: spacing[4] }}>
              {!hasDocuments ? (
                <div
                  style={{
                    padding: spacing[4],
                    borderRadius: radius.md,
                    background: colors.warningMuted,
                    border: `1px solid #F5D98A`,
                    color: '#9A6B00',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: spacing[1] }}>Aucun document soumis</div>
                  <p style={{ margin: `0 0 ${spacing[3]}px`, fontSize: typography.bodySm.fontSize }}>
                    Vous traitez ce dossier sans pièces justificatives.
                  </p>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      fontWeight: 700,
                      fontSize: typography.bodySm.fontSize,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={noDocsAcknowledged}
                      onChange={(e) => setNoDocsAcknowledged(e.target.checked)}
                    />
                    Je reconnais qu&apos;aucun document n&apos;a été fourni
                  </label>
                </div>
              ) : null}

              {softWarnings.length > 0 ? (
                <div
                  style={{
                    padding: spacing[4],
                    borderRadius: radius.md,
                    background: colors.warningMuted,
                    border: `1px solid #F5D98A`,
                    color: '#9A6B00',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: spacing[2] }}>Avertissements</div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.1rem',
                      fontSize: typography.bodySm.fontSize,
                      display: 'grid',
                      gap: spacing[1],
                    }}
                  >
                    {softWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {structuredIssues.length > 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: typography.caption.fontSize,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: colors.textMuted,
                      marginBottom: spacing[2],
                    }}
                  >
                    Feedback structuré (marchand)
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: typography.bodySm.fontSize,
                      lineHeight: 1.5,
                      background: colors.surfaceSubtle,
                      borderRadius: radius.md,
                      padding: spacing[4],
                    }}
                  >
                    {structuredIssues.join('\n\n')}
                  </pre>
                </div>
              ) : null}

              <label style={{ display: 'block' }}>
                <span
                  style={{
                    fontSize: typography.caption.fontSize,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: colors.textMuted,
                  }}
                >
                  Remarque additionnelle
                </span>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Complément libre — les motifs FAIL et documents sont déjà structurés ci-dessus…"
                  style={{
                    ...webInputStyle,
                    marginTop: spacing[2],
                    fontFamily: 'inherit',
                    minHeight: 96,
                  }}
                />
              </label>
            </div>
          </div>
        </Workspace>
      ) : null}

      {!successAction ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: spacing[4],
            gap: spacing[3],
          }}
        >
          <Button variant="ghost" onClick={goPrev} disabled={step === 1} leadingIcon={<ChevronLeft size={16} />}>
            Précédent
          </Button>
          {step < 4 ? (
            <Button onClick={goNext}>
              Suivant <ChevronRight size={16} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
            </Button>
          ) : (
            <span style={{ fontSize: typography.caption.fontSize, color: colors.textMuted, alignSelf: 'center' }}>
              Décidez via la barre ci-dessous
            </span>
          )}
        </div>
      ) : null}

      {!successAction ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            background: colors.surface,
            borderTop: `1px solid ${colors.borderSubtle}`,
            boxShadow: '0 -4px 16px rgba(16,24,40,0.06)',
            padding: `${spacing[3]}px ${spacing[5]}px`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              gap: spacing[2],
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                marginRight: 'auto',
                fontSize: typography.caption.fontSize,
                color: colors.textMuted,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Décision finale
            </span>
            <Button
              variant="danger"
              loading={loading}
              disabled={loading}
              onClick={() => requestDecision('block')}
            >
              Rejeter
            </Button>
            <Button
              variant="secondary"
              loading={loading}
              disabled={loading}
              onClick={() => requestDecision('request_correction')}
            >
              Demander correction
            </Button>
            <Button
              variant="primary"
              loading={loading}
              disabled={loading || (needsNoDocsAck && !noDocsAcknowledged)}
              onClick={() => requestDecision('approve')}
            >
              Approuver
            </Button>
          </div>
        </div>
      ) : null}

      <KycDocumentPreview
        document={previewDoc}
        open={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
      />

      <ConfirmDialog
        open={pendingAction != null && confirmCopy != null}
        onClose={() => {
          if (!loading) setPendingAction(null);
        }}
        onConfirm={() => {
          if (pendingAction) void handleDecision(pendingAction);
        }}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        cancelLabel="Annuler"
        tone={confirmCopy?.tone ?? 'default'}
        loading={loading}
      />
    </div>
  );
}
