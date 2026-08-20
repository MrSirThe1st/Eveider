import { colors, spacing, typography } from '@eveider/config-ui';
import { PARCEL_STATUS_LABELS, PARCEL_STATUSES, type ParcelStatus } from '@eveider/domain';

type ParcelLifecycleProps = {
  status: ParcelStatus;
};

export function ParcelLifecycle({ status }: ParcelLifecycleProps) {
  const currentIndex = PARCEL_STATUSES.indexOf(status);

  return (
    <ol
      aria-label="Cycle de vie du colis"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gap: spacing[3],
      }}
    >
      {PARCEL_STATUSES.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step}
            style={{
              display: 'grid',
              gridTemplateColumns: '16px 1fr',
              gap: spacing[3],
              alignItems: 'start',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                marginTop: 2,
                borderRadius: '50%',
                border: `2px solid ${done || current ? colors.secondary : colors.borderSubtle}`,
                background: done ? colors.secondary : current ? colors.primary : colors.surface,
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.bodySm.fontSize,
                  fontWeight: current ? typography.weights.bold : typography.weights.semibold,
                  color: done || current ? colors.secondary : colors.textMuted,
                }}
              >
                {PARCEL_STATUS_LABELS[step]}
              </p>
              {current ? (
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: typography.caption.fontSize,
                    color: colors.textMuted,
                  }}
                >
                  Étape actuelle
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function collectionStatusCopy(status: ParcelStatus): { title: string; body: string } {
  if (status === 'collected') {
    return {
      title: 'Retiré',
      body: 'Le destinataire a collecté le colis au point Eveider.',
    };
  }
  if (status === 'ready_for_pickup') {
    return {
      title: 'En attente de retrait',
      body: 'Le colis est au point. Le code PIN est envoyé uniquement au destinataire.',
    };
  }
  if (status === 'delivered_to_locker') {
    return {
      title: 'Déposé au point',
      body: 'Le colis a été déposé. Le destinataire sera notifié pour le retrait.',
    };
  }
  return {
    title: 'Pas encore au point',
    body: 'Le retrait client commencera une fois le colis déposé au casier.',
  };
}
