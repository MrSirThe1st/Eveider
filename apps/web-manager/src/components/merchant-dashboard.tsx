'use client';

import type { BusinessAnalytics, BusinessOperationalSnapshot } from '@eveider/data-access';
import { colors, spacing, typography } from '@eveider/config-ui';
import { formatDeliveryFee, type BusinessStatus } from '@eveider/domain';
import { PageFrame } from '@eveider/ui';
import Link from 'next/link';
import { Bar } from 'react-chartjs-2';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { baseBarOptions, chartPalette, formatDayLabel } from '@/lib/admin-chart-theme';
import type { BusinessParcelAttentionFilter } from '@/lib/business-presentation';
import { OpsActionList, OpsPanel, OpsSection, OpsStatStrip } from '@/components/ops-ui';

type MerchantDashboardProps = {
  businessName: string;
  status: BusinessStatus;
  analytics: BusinessAnalytics;
  operational: BusinessOperationalSnapshot;
  canCreateParcels?: boolean;
};

function colisHref(attention: BusinessParcelAttentionFilter) {
  return `${WEB_ROUTES.businessParcels}?attention=${attention}`;
}

function operationalSummary(operational: BusinessOperationalSnapshot): string {
  const attentionCount =
    operational.awaitingHandoff +
    operational.awaitingDeposit +
    operational.returnsToReview +
    operational.returnsToCollect;
  const inPlay =
    operational.awaitingHandoff +
    operational.awaitingDeposit +
    operational.inTransit +
    operational.atLocker +
    operational.readyForPickup;

  if (attentionCount > 0) {
    return `${attentionCount} élément${attentionCount > 1 ? 's' : ''} demandent votre attention.`;
  }
  if (inPlay > 0) {
    return `Rien à traiter. ${inPlay} colis en cours sur le réseau.`;
  }
  if (operational.collected > 0) {
    return 'Rien à traiter. Les derniers colis ont déjà été retirés.';
  }
  return 'Aucun colis pour le moment. Créez un envoi pour commencer.';
}

export function MerchantDashboard({
  businessName,
  status,
  analytics,
  operational,
  canCreateParcels = false,
}: MerchantDashboardProps) {
  const isBlocked = status === 'blocked' || status === 'suspended';
  const owedLabel = formatDeliveryFee(operational.businessOwedAmount, operational.businessOwedCurrency);
  const hasVolume = analytics.dailyVolume.some((entry) => entry.count > 0);

  const overview = [
    {
      label: 'En attente',
      value: operational.awaitingHandoff + operational.awaitingDeposit,
      href: WEB_ROUTES.businessParcels,
    },
    { label: 'En transport', value: operational.inTransit, href: colisHref('in_transit') },
    { label: 'Au casier', value: operational.atLocker, href: colisHref('at_locker') },
    {
      label: 'Prêts au retrait',
      value: operational.readyForPickup,
      href: colisHref('ready_for_pickup'),
    },
    { label: 'Retirés', value: operational.collected, href: colisHref('collected') },
  ];

  const volumeData = {
    labels: analytics.dailyVolume.map((entry) => formatDayLabel(entry.date)),
    datasets: [
      {
        label: 'Colis créés',
        data: analytics.dailyVolume.map((entry) => entry.count),
        backgroundColor: chartPalette.primary,
        borderRadius: 4,
        maxBarThickness: 16,
      },
    ],
  };

  return (
    <PageFrame
      title={businessName}
      description={
        isBlocked
          ? 'Ce compte ne peut plus envoyer de colis tant qu’il n’est pas réactivé.'
          : operationalSummary(operational)
      }
      layout="standard"
      action={
        canCreateParcels && !isBlocked ? (
          <Link href={WEB_ROUTES.businessNewParcel} className="nb-btn nb-btn-primary">
            Nouveau colis
          </Link>
        ) : undefined
      }
    >
      {isBlocked ? (
        <div
          role="status"
          className="ops-panel"
          style={{
            marginBottom: spacing[6],
            borderColor: colors.danger,
            background: colors.dangerMuted,
          }}
        >
          <p style={{ margin: 0, fontWeight: typography.weights.bold, color: colors.secondary }}>
            {status === 'blocked' ? 'Compte bloqué' : 'Compte suspendu'}
          </p>
          <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.caption.fontSize, color: colors.textMuted }}>
            Vous ne pouvez plus envoyer de colis tant que le compte n’est pas réactivé.
          </p>
        </div>
      ) : null}

      <OpsSection title="À traiter" label="À traiter">
        <OpsActionList
          items={[
            {
              label: 'À remettre à Eveider',
              hint: 'Collecte Eveider en attente',
              count: operational.awaitingHandoff,
              href: colisHref('awaiting_handoff'),
            },
            {
              label: 'À déposer au casier',
              hint: 'Dépôt au casier encore à faire',
              count: operational.awaitingDeposit,
              href: colisHref('awaiting_deposit'),
            },
            {
              label: 'Retours à examiner',
              hint: 'Demandes destinataire',
              count: operational.returnsToReview,
              href: colisHref('returns'),
              accent: true,
            },
            {
              label: 'Retours à récupérer',
              hint: 'Retrait par l’entreprise',
              count: operational.returnsToCollect,
              href: colisHref('returns'),
            },
            {
              label: 'Montant dû',
              hint: 'Retours et stockage — pas les frais destinataire',
              count: operational.businessOwedAmount > 0 ? 1 : 0,
              value: owedLabel,
              href: WEB_ROUTES.businessBilling,
            },
          ]}
        />
      </OpsSection>

      <OpsSection
        title="Aperçu des colis"
        description="« En transport » ne compte que les colis réellement en cours de transport Eveider."
      >
        <OpsStatStrip items={overview} />
      </OpsSection>

      <OpsSection title="Historique">
        <div className="ops-history-split">
          <OpsPanel>
            <p className="ops-section__title" style={{ marginBottom: 4 }}>
              Volume de colis
            </p>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: colors.textMuted }}>
              30 derniers jours
            </p>
            {hasVolume ? (
              <div style={{ height: 160 }}>
                <Bar data={volumeData} options={baseBarOptions()} />
              </div>
            ) : (
              <div className="ops-empty">
                <p className="ops-empty__title">Pas encore de volume</p>
                <p className="ops-empty__description">
                  Le graphique apparaîtra dès que vous créerez des colis.
                </p>
              </div>
            )}
          </OpsPanel>

          <OpsPanel>
            <p className="ops-section__title" style={{ marginBottom: 4 }}>
              Casiers les plus utilisés
            </p>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.75rem', color: colors.textMuted }}>
              Destinations de vos envois
            </p>
            {analytics.topLockers.length === 0 ? (
              <div className="ops-empty">
                <p className="ops-empty__title">Aucun casier utilisé</p>
                <p className="ops-empty__description">
                  Les casiers de destination apparaîtront ici après vos premiers envois.
                </p>
              </div>
            ) : (
              <ul className="ops-rank-list">
                {analytics.topLockers.map((locker) => (
                  <li key={locker.lockerId}>
                    <span className="ops-rank-list__name">{locker.lockerName}</span>
                    <span className="ops-rank-list__count">{locker.parcelCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </OpsPanel>
        </div>
      </OpsSection>
    </PageFrame>
  );
}
