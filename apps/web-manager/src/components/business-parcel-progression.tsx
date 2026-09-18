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
  if (location === 'returned_to_business') {
    return {
      title: 'Retourné',
      body: 'Le colis a été ramené à votre entreprise. Le compartiment du point a été libéré.',
    };
  }
  if (location === 'return_in_progress') {
    return {
      title: 'Retour en cours',
      body: 'Un coursier ramène le colis du point vers votre entreprise.',
    };
  }
  if (location === 'collected') {
    return {
      title: 'Retiré',
      body: 'Le destinataire a collecté le colis au point Eveider.',
    };
  }
  if (location === 'customer_return_requested') {
    return {
      title: 'Retour demandé',
      body: 'Le destinataire a demandé un retour. Approuvez ou refusez la demande.',
    };
  }
  if (location === 'customer_return_authorized') {
    return {
      title: 'Retour autorisé',
      body: 'Le destinataire peut déposer le colis au casier de retour.',
    };
  }
  if (location === 'customer_return_at_locker') {
    return {
      title: 'Retour au casier',
      body: 'Le colis retourné est au casier Eveider.',
    };
  }
  if (location === 'customer_return_in_transit') {
    return {
      title: 'Retour en cours',
      body: 'Eveider ramène le colis du casier vers votre entreprise.',
    };
  }
  if (location === 'customer_return_completed') {
    return {
      title: 'Retourné au marchand',
      body: 'Le colis retourné a été récupéré par votre entreprise.',
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
      title: 'Au casier',
      body: 'Le colis est au casier. Eveider prépare le code de retrait — le destinataire n’est pas encore notifié.',
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
      title: 'Chauffeur assigné',
      body: 'Un chauffeur Eveider va enlever le colis. Le statut du colis reste en attente de prise en charge.',
    };
  }
  if (location === 'awaiting_dropoff') {
    return {
      title: 'En attente de dépôt',
      body: 'Déposez le colis au point Eveider, puis confirmez le dépôt sur cette page.',
    };
  }
  return {
    title: 'En attente du coursier',
    body: 'Le colis est enregistré. Eveider assignera une collecte.',
  };
}
