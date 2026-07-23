'use client';

import type { AdminReviewDecisionInput } from '@eveider/api-contracts';
import { colors, radius, webCardStyle, webInputStyle, webPrimaryButtonStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { BusinessApplicationDetail } from '@/server/business-applications';

type DocReviewStatus = 'approved' | 'rejected' | 'correction_requested';
type CheckEntry = NonNullable<AdminReviewDecisionInput['checks']>[number];
type ApplicationDocument = BusinessApplicationDetail['documents'][number];
type ApplicationLocation = BusinessApplicationDetail['locations'][number];

function toDocReviewStatus(status: string): DocReviewStatus {
  if (status === 'approved' || status === 'rejected' || status === 'correction_requested') {
    return status;
  }
  return 'correction_requested';
}

interface AdminApplicationReviewProps {
  business: BusinessApplicationDetail;
  /** When true, skip outer max-width / title (provided by PageFrame). */
  hidePageChrome?: boolean;
}

export function AdminApplicationReview({
  business,
  hidePageChrome = false,
}: AdminApplicationReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Checklist states
  const latestVerification = business.verifications?.[0];
  const initialChecks = latestVerification?.checks ?? [];

  const getCheckStatus = (type: string): 'PASS' | 'FAIL' | 'PENDING' => {
    const status = initialChecks.find((c) => c.type === type)?.status;
    if (status === 'PASS' || status === 'FAIL' || status === 'PENDING') return status;
    return 'PENDING';
  };

  const [checks, setChecks] = useState<Record<string, 'PASS' | 'FAIL' | 'PENDING'>>({
    PHONE_VERIFIED: business.isPhoneVerified ? 'PASS' : getCheckStatus('PHONE_VERIFIED'),
    IDENTITY_MATCHED: getCheckStatus('IDENTITY_MATCHED'),
    DOCUMENT_VALID: getCheckStatus('DOCUMENT_VALID'),
    ADDRESS_CONFIRMED: getCheckStatus('ADDRESS_CONFIRMED'),
    COMPANY_REGISTERED: getCheckStatus('COMPANY_REGISTERED'),
    BANK_ACCOUNT_VERIFIED: getCheckStatus('BANK_ACCOUNT_VERIFIED'),
  });

  // Documents Feedback
  const [docStatuses, setDocStatuses] = useState<Record<string, DocReviewStatus>>(
    (business.documents ?? []).reduce<Record<string, DocReviewStatus>>((acc, doc) => {
      acc[doc.id] = toDocReviewStatus(doc.status ?? 'pending');
      return acc;
    }, {}),
  );

  function toggleCheck(type: string, status: 'PASS' | 'FAIL' | 'PENDING') {
    setChecks((prev) => ({ ...prev, [type]: status }));
  }

  function toggleDocStatus(docId: string, status: 'approved' | 'rejected' | 'correction_requested') {
    setDocStatuses((prev) => ({ ...prev, [docId]: status }));
  }

  async function handleDecision(action: 'approve' | 'request_correction' | 'block') {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const checksPayload: NonNullable<AdminReviewDecisionInput['checks']> = Object.entries(checks).map(
      ([type, status]) => ({
        type: type as CheckEntry['type'],
        status,
      }),
    );

    const docsPayload = Object.entries(docStatuses).map(([documentId, status]) => ({
      documentId,
      status,
    }));

    try {
      const res = await fetch(`/api/businesses/${business.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes,
          checks: checksPayload,
          documentsFeedback: docsPayload,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        setError(result.error ?? 'Traitement de la décision échoué');
        return;
      }

      setSuccess(`Décision enregistrée : ${action === 'approve' ? 'Compte Approuvé & Actif !' : action === 'request_correction' ? 'Corrections demandées' : 'Compte Bloqué'}`);
      router.refresh();
      setTimeout(() => {
        router.push('/tableau-de-bord/entreprises/applications');
      }, 1500);
    } catch {
      setError('Erreur réseau lors de la soumission de la décision.');
    } finally {
      setLoading(false);
    }
  }

  const ownerUser = business.users?.[0];
  const mainAddress = business.locations?.find((l: ApplicationLocation) => l.type === 'business_address');
  const pickupPoint = business.locations?.find((l: ApplicationLocation) => l.type === 'pickup_point');

  const actions = (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: hidePageChrome ? '1.5rem' : 0 }}>
      <button
        type="button"
        onClick={() => void handleDecision('request_correction')}
        disabled={loading}
        style={{
          ...webSecondaryButtonStyle,
          height: 42,
          padding: '0 1.25rem',
          borderColor: '#F59E0B',
          color: '#B45309',
          fontWeight: 700,
        }}
      >
        Demander des corrections
      </button>
      <button
        type="button"
        onClick={() => void handleDecision('approve')}
        disabled={loading}
        style={{
          ...webPrimaryButtonStyle,
          height: 42,
          padding: '0 1.5rem',
          fontWeight: 700,
        }}
      >
        Approuver et activer
      </button>
    </div>
  );

  return (
    <div style={hidePageChrome ? undefined : { maxWidth: 1000, margin: '1.5rem auto', padding: '0 1rem 4rem' }}>
      {!hidePageChrome ? (
        <>
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

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '1rem 0 2rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  background: '#121212',
                  color: '#09D40B',
                  borderRadius: 4,
                }}
              >
                ID : {business.id.slice(0, 8)}
              </span>
              <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.75rem', fontWeight: 800 }}>
                Revue KYC — {business.name}
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>
                Statut actuel :{' '}
                <strong>
                  {BUSINESS_STATUS_LABELS[business.status as BusinessStatus] ?? business.status}
                </strong>
              </p>
            </div>
            {actions}
          </div>
        </>
      ) : (
        actions
      )}

      {success ? (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534', padding: '1rem', borderRadius: 8, fontWeight: 700, marginBottom: '1.5rem' }}>
          ✓ {success}
        </div>
      ) : null}

      {error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '1rem', borderRadius: 8, fontWeight: 700, marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Business Profile */}
        <section style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800 }}>Profil & Informations Entreprise</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.84375rem' }}>
            <div><strong>Nom commercial :</strong> {business.name}</div>
            <div><strong>Classification Risque :</strong> {business.riskClassification ?? 'INDIVIDUAL_SELLER'}</div>
            <div><strong>Secteur d&apos;activité :</strong> {business.industry ?? 'Non renseigné'}</div>
            <div><strong>Canaux de vente :</strong> {business.salesChannels?.join(', ') ?? 'Aucun'}</div>
            <div><strong>Description :</strong> {business.description ?? '—'}</div>
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.65rem', marginTop: '0.35rem' }}>
              <strong>Société Légale :</strong> {business.legalCompanyName ?? '—'}
            </div>
            <div><strong>N° RCCM :</strong> {business.rccmNumber ?? '—'} · <strong>N° NIF :</strong> {business.nifNumber ?? '—'}</div>
            <div><strong>Représentant Légal :</strong> {business.legalRepName ?? business.individualFullName ?? '—'}</div>
          </div>
        </section>

        {/* Owner & Location */}
        <section style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800 }}>Propriétaire & Exploitation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.84375rem' }}>
            <div><strong>Utilisateur :</strong> {ownerUser?.fullName ?? '—'} ({ownerUser?.userRole ?? 'owner'})</div>
            <div><strong>Email :</strong> {business.contactEmail ?? ownerUser?.email ?? '—'}</div>
            <div><strong>Téléphone :</strong> {business.contactPhone ?? ownerUser?.phone ?? '—'} {business.isPhoneVerified ? '✓ (Vérifié)' : '⚠️ Non vérifié'}</div>
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.65rem', marginTop: '0.35rem' }}>
              <strong>Adresse du siège :</strong> {mainAddress?.street ?? '—'}, {mainAddress?.city ?? 'Kinshasa'}
            </div>
            <div><strong>Méthode d&apos;enlèvement :</strong> {pickupPoint?.pickupMethod ?? 'courier_pickup'}</div>
            <div><strong>Point de dépôt / adresse :</strong> {pickupPoint?.street ?? '—'}</div>
            <div><strong>Contact enlèvement :</strong> {pickupPoint?.contactPerson ?? '—'} ({pickupPoint?.contactPhone ?? '—'})</div>
          </div>
        </section>

      </div>

      {/* Verification Checklist Table */}
      <section style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card, marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800 }}>Verification Checklist (Grille de contrôle admin)</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key: 'PHONE_VERIFIED', label: '✓ Téléphone vérifié (SMS OTP)' },
            { key: 'IDENTITY_MATCHED', label: '✓ Identité du propriétaire correspondante aux pièces' },
            { key: 'COMPANY_REGISTERED', label: '✓ Registre RCCM & NIF valides' },
            { key: 'DOCUMENT_VALID', label: '✓ Documents lisibles et non périmés' },
            { key: 'ADDRESS_CONFIRMED', label: '✓ Adresse d\'enlèvement / d\'exploitation vérifiée' },
            { key: 'BANK_ACCOUNT_VERIFIED', label: '✓ Coordonnées de paiement COD valides' },
          ].map((item) => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              <span style={{ fontWeight: 700, fontSize: '0.84375rem' }}>{item.label}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => toggleCheck(item.key, 'PASS')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 4,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    border: checks[item.key] === 'PASS' ? '2px solid #09D40B' : '1px solid #CBD5E1',
                    background: checks[item.key] === 'PASS' ? '#DCFCE7' : '#FFFFFF',
                    color: checks[item.key] === 'PASS' ? '#15803D' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  PASS
                </button>
                <button
                  type="button"
                  onClick={() => toggleCheck(item.key, 'FAIL')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 4,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    border: checks[item.key] === 'FAIL' ? '2px solid #EF4444' : '1px solid #CBD5E1',
                    background: checks[item.key] === 'FAIL' ? '#FEE2E2' : '#FFFFFF',
                    color: checks[item.key] === 'FAIL' ? '#B91C1C' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  FAIL
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Documents Section */}
      <section style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card, marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800 }}>Documents Section (Pièces justificatives transmises)</h3>
        
        {business.documents && business.documents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {business.documents.map((doc: ApplicationDocument) => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', display: 'block' }}>
                    📄 {doc.type.toUpperCase()} ({doc.fileName ?? 'document'})
                  </span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: colors.secondary, fontWeight: 700 }}>
                    Voir / Télécharger le document ↗
                  </a>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => toggleDocStatus(doc.id, 'approved')}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      border: docStatuses[doc.id] === 'approved' ? '2px solid #09D40B' : '1px solid #CBD5E1',
                      background: docStatuses[doc.id] === 'approved' ? '#DCFCE7' : '#FFFFFF',
                      color: docStatuses[doc.id] === 'approved' ? '#15803D' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDocStatus(doc.id, 'correction_requested')}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      border: docStatuses[doc.id] === 'correction_requested' ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                      background: docStatuses[doc.id] === 'correction_requested' ? '#FEF3C7' : '#FFFFFF',
                      color: docStatuses[doc.id] === 'correction_requested' ? '#B45309' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Demander Correction
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>Aucun document déposé pour le moment.</p>
        )}
      </section>

      {/* Decision Box */}
      <section style={{ ...webCardStyle, padding: '1.75rem', borderRadius: radius.card, background: '#121212', color: '#FFFFFF' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 800, color: '#09D40B' }}>
          Decision & Communication avec le marchand
        </h3>

        <label style={{ display: 'block', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1' }}>Remarques d&apos;évaluation / Motifs de correction :</span>
          <textarea
            rows={3}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Ex : Veuillez re-téléverser une photo plus claire du certificat NIF…"
            style={{ ...webInputStyle, marginTop: '0.5rem', background: '#1E293B', color: '#FFFFFF', border: '1px solid #334155', fontFamily: 'inherit' }}
          />
        </label>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void handleDecision('approve')}
            disabled={loading}
            style={{ ...webPrimaryButtonStyle, flex: 2, height: 46, background: '#09D40B', color: '#121212', fontWeight: 800, fontSize: '0.875rem' }}
          >
            {loading ? 'Traitement…' : '✓ APPROUVER ET ACTIVER LE COMPTE BUSINESS'}
          </button>

          <button
            type="button"
            onClick={() => void handleDecision('request_correction')}
            disabled={loading}
            style={{ ...webSecondaryButtonStyle, flex: 1, height: 46, background: '#F59E0B', color: '#121212', fontWeight: 700, fontSize: '0.8125rem', border: 'none' }}
          >
            ⚠️ DEMANDER CORRECTION
          </button>

          <button
            type="button"
            onClick={() => void handleDecision('block')}
            disabled={loading}
            style={{ ...webSecondaryButtonStyle, flex: 1, height: 46, background: '#EF4444', color: '#FFFFFF', fontWeight: 700, fontSize: '0.8125rem', border: 'none' }}
          >
            🚫 REJETER & BLOQUER
          </button>
        </div>
      </section>

    </div>
  );
}
