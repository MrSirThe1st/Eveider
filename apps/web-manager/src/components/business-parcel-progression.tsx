import { colors, spacing, typography } from '@eveider/config-ui';
import type { BusinessParcelLocation } from '@eveider/domain';
import type { BusinessParcelProgressionItem } from '@/lib/business-parcel-presenter';

type BusinessParcelProgressionProps = {
  steps: BusinessParcelProgressionItem[];
};

export function BusinessParcelProgression({ steps }: BusinessParcelProgressionProps) {
  return (
    <ol
      aria-label="Progression du colis"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gap: spacing[3],
      }}
    >
      {steps.map((step) => (
        <li
          key={step.step}
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
              border: `2px solid ${step.reached || step.current ? colors.secondary : colors.borderSubtle}`,
              background: step.reached && !step.current
                ? colors.secondary
                : step.current
                  ? colors.primary
                  : colors.surface,
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: typography.bodySm.fontSize,
                fontWeight: step.current ? typography.weights.bold : typography.weights.semibold,
                color: step.reached || step.current ? colors.secondary : colors.textMuted,
              }}
            >
              {step.label}
            </p>
            {step.current ? (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: typography.caption.fontSize,
                  color: colors.textMuted,
                }}
              >
                Situation actuelle
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function locationStatusCopy(location: BusinessParcelLocation): {
  title: string;
  body: string;
} {
  if (location === 'collected') {
    return {
      title: 'Retiré',
      body: 'Le destinataire a collecté le colis au point Eveider.',
    };
  }
  if (location === 'ready_for_pickup') {
    return {
      title: 'Prêt pour retrait',
      body: 'Le destinataire peut retirer le colis. Le code PIN lui est envoyé uniquement.',
    };
  }
  if (location === 'at_locker') {
    return {
      title: 'Arrivé au point',
      body: 'Le colis est au point Eveider, mais le retrait n’est pas encore ouvert.',
    };
  }
  if (location === 'in_transit') {
    return {
      title: 'En transit',
      body: 'Le colis est en route vers le point de destination.',
    };
  }
  if (location === 'courier_assigned') {
    return {
      title: 'Coursier assigné',
      body: 'Un coursier va enlever le colis. L’identité du coursier n’est pas affichée ici.',
    };
  }
  if (location === 'awaiting_dropoff') {
    return {
      title: 'En attente de dépôt',
      body: 'Déposez le colis au point Eveider pour lancer la livraison.',
    };
  }
  return {
    title: 'En attente du coursier',
    body: 'Le colis est enregistré. Eveider assignera un enlèvement.',
  };
}
