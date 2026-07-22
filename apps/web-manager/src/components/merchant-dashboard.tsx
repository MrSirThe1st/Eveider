'use client';

import { radius, webCardStyle, webPrimaryButtonStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WEB_ROUTES } from '@/lib/auth-routing';

interface MerchantDashboardProps {
  businessName: string;
  status: string;
  isPhoneVerified: boolean;
  permissions?: Array<{ feature: string; status: string }>;
  limit?: { dailyShipments: number; maxPackageValueUsd: number; codDailyLimitUsd: number } | null;
  parcelsCount?: number;
  deliveredCount?: number;
  pendingCount?: number;
  balanceUsd?: number;
}

export function MerchantDashboard({
  businessName,
  status,
  isPhoneVerified,
  permissions = [],
  limit,
  parcelsCount = 0,
  deliveredCount = 0,
  pendingCount = 0,
  balanceUsd = 0,
}: MerchantDashboardProps) {
  const router = useRouter();

  const isPendingReview = status === 'pending_review' || status === 'pending';
  const isPendingCorrection = status === 'pending_correction';
  const isActive = status === 'active';

  const canCreateShipment = isActive && permissions.some((p) => p.feature === 'CREATE_SHIPMENT' && p.status === 'ENABLED');
  const codEnabled = isActive && permissions.some((p) => p.feature === 'COD' && p.status === 'ENABLED');

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '4rem' }}>
      
      {/* Top Banner Alert if not active */}
      {!isActive ? (
        <div
          style={{
            background: isPendingCorrection ? '#FFFBEB' : isPendingReview ? '#EFF6FF' : '#FEF2F2',
            borderBottom: isPendingCorrection ? '2px solid #F59E0B' : isPendingReview ? '2px solid #3B82F6' : '2px solid #EF4444',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>
              {isPendingCorrection ? '⚠️' : isPendingReview ? '⏳' : '⚙️'}
            </span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1E293B' }}>
                {isPendingReview
                  ? 'Compte en attente de vérification KYC (Revue sous 24-48h)'
                  : isPendingCorrection
                  ? 'Correction requise sur votre dossier d\'inscription'
                  : 'Compte en cours de configuration'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                {isPendingReview
                  ? 'La création d\'expéditions est désactivée jusqu\'à approbation admin.'
                  : isPendingCorrection
                  ? 'Un administrateur a demandé des corrections sur votre dossier.'
                  : 'Veuillez terminer le wizard de configuration.'}
              </p>
            </div>
          </div>
          <div>
            <Link
              href="/onboarding"
              className="btn btn-primary"
              style={{ height: 36, padding: '0 1rem', fontSize: '0.75rem', background: '#121212', color: '#FFFFFF', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}
            >
              {isPendingCorrection ? 'Corriger le dossier' : 'Consulter le dossier'}
            </Link>
          </div>
        </div>
      ) : null}

      {/* Main Container */}
      <main style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {/* Welcome Section */}
        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', background: isActive ? '#DCFCE7' : '#F1F5F9', color: isActive ? '#15803D' : '#475569', borderRadius: 4 }}>
                {isActive ? 'COMPTE VÉRIFIÉ' : status.toUpperCase()}
              </span>
              {isPhoneVerified ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09D40B' }}>✓ Téléphone vérifié</span>
              ) : null}
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>
              Bienvenue, {businessName}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              disabled={!canCreateShipment}
              onClick={() => router.push(WEB_ROUTES.businessNewParcel)}
              style={{
                ...webPrimaryButtonStyle,
                height: 44,
                padding: '0 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                opacity: canCreateShipment ? 1 : 0.5,
                cursor: canCreateShipment ? 'pointer' : 'not-allowed',
              }}
            >
              + Create Shipment
            </button>
          </div>
        </section>

        {/* KPI Cards Grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          <div style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
              SHIPMENTS TOTAL
            </span>
            <p style={{ margin: '0.75rem 0 0', fontSize: '2.25rem', fontWeight: 800, color: '#121212' }}>
              {parcelsCount}
            </p>
          </div>

          <div style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', letterSpacing: '0.05em' }}>
              DELIVERED
            </span>
            <p style={{ margin: '0.75rem 0 0', fontSize: '2.25rem', fontWeight: 800, color: '#166534' }}>
              {deliveredCount}
            </p>
          </div>

          <div style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', letterSpacing: '0.05em' }}>
              PENDING
            </span>
            <p style={{ margin: '0.75rem 0 0', fontSize: '2.25rem', fontWeight: 800, color: '#D97706' }}>
              {pendingCount}
            </p>
          </div>

          <div style={{ ...webCardStyle, padding: '1.5rem', borderRadius: radius.card, background: '#121212', color: '#FFFFFF' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09D40B', letterSpacing: '0.05em' }}>
              BALANCE (COD)
            </span>
            <p style={{ margin: '0.75rem 0 0', fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF' }}>
              ${balanceUsd.toFixed(2)}
            </p>
          </div>
        </section>

        {/* Quick Actions & Trust Level Section */}
        <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          
          <div style={{ ...webCardStyle, padding: '1.75rem', borderRadius: radius.card }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.125rem', fontWeight: 700 }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => router.push(WEB_ROUTES.businessDashboard)}
                style={{ ...webSecondaryButtonStyle, height: 42, fontSize: '0.8125rem', fontWeight: 700, justifyContent: 'flex-start', padding: '0 1rem' }}
              >
                📦 View Shipments
              </button>
              <button
                type="button"
                onClick={() => alert('Facturation & Relevés COD')}
                style={{ ...webSecondaryButtonStyle, height: 42, fontSize: '0.8125rem', fontWeight: 700, justifyContent: 'flex-start', padding: '0 1rem' }}
              >
                💳 Billing & Payouts
              </button>
              <button
                type="button"
                onClick={() => router.push('/onboarding')}
                style={{ ...webSecondaryButtonStyle, height: 42, fontSize: '0.8125rem', fontWeight: 700, justifyContent: 'flex-start', padding: '0 1rem' }}
              >
                ⚙️ Business Settings
              </button>
            </div>
          </div>

          <div style={{ ...webCardStyle, padding: '1.75rem', borderRadius: radius.card, background: '#F8FAFC' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Account & Trust Level</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Création colis :</span>
                <strong style={{ color: canCreateShipment ? '#166534' : '#DC2626' }}>{canCreateShipment ? 'AUTORISÉ' : 'RESTE EN ATTENTE'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Encaissement COD :</span>
                <strong style={{ color: codEnabled ? '#166534' : '#D97706' }}>{codEnabled ? 'ACTIF' : 'NOUVEAU SELLER'}</strong>
              </div>
              {limit ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Quota journalier :</span>
                    <strong>{limit.dailyShipments} colis/jour</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Plafond COD :</span>
                    <strong>${limit.codDailyLimitUsd}/jour</strong>
                  </div>
                </>
              ) : null}
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
