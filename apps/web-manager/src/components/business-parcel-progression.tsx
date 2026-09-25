import type { BusinessParcelProgressionStep } from '@eveider/domain';
import type { BusinessParcelProgressionItem } from '@/lib/business-parcel-presenter';
import styles from './business-parcel-progression.module.css';

const SHORT_PROGRESSION_LABELS: Record<BusinessParcelProgressionStep, string> = {
  submitted: 'Créé',
  awaiting_courier: 'En attente de collecte',
  awaiting_dropoff: 'En attente de dépôt',
  courier_assigned: 'Chauffeur assigné',
  in_transit: 'En transit',
  at_locker: 'Au casier',
  ready_for_pickup: 'Prêt au retrait',
  collected: 'Retiré',
  return_in_progress: 'Retour en cours',
  returned_to_business: 'Retourné',
  customer_return_requested: 'Retour demandé',
  customer_return_authorized: 'Retour autorisé',
  customer_return_at_locker: 'Retour au casier',
  customer_return_in_transit: 'Retour en cours',
  customer_return_completed: 'Retourné',
};

type BusinessParcelProgressionProps = {
  progression: BusinessParcelProgressionItem[];
};

export function BusinessParcelProgression({ progression }: BusinessParcelProgressionProps) {
  if (progression.length === 0) return null;

  return (
    <ol className={styles.track} aria-label="Progression du colis">
      {progression.map((item, index) => {
        const label = SHORT_PROGRESSION_LABELS[item.step] ?? item.label;
        const state = item.current ? 'current' : item.reached ? 'reached' : 'upcoming';
        return (
          <li key={item.step} className={styles.step} data-state={state}>
            {index > 0 ? <span className={styles.connector} aria-hidden /> : null}
            <span className={styles.marker} aria-hidden>
              {item.reached && !item.current ? '✓' : item.current ? '●' : '○'}
            </span>
            <span className={styles.label}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
