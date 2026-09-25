import { webCardStyle } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS, PARCEL_STATUS_LABELS } from '@eveider/domain';
import { EmptyState, IconInbox } from '@eveider/ui';
import type { AdminParcelEventDto } from '@/lib/parcel-presenter';
import styles from './parcel-event-timeline.module.css';

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type ParcelEventTimelineProps = {
  events: AdminParcelEventDto[];
  /** Optional tighter card padding for denser layouts. */
  compact?: boolean;
  parcelStatusLabel?: (status: NonNullable<AdminParcelEventDto['newParcelStatus']>) => string;
  deliveryStatusLabel?: (status: NonNullable<AdminParcelEventDto['newDeliveryStatus']>) => string;
};

export function ParcelEventTimeline({
  events,
  compact = false,
  parcelStatusLabel,
  deliveryStatusLabel,
}: ParcelEventTimelineProps) {
  return (
    <section
      style={{
        ...webCardStyle,
        padding: compact ? '1.25rem 1.5rem' : '2rem',
        marginTop: '1.25rem',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Historique</h3>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>
        Comment ce colis est arrivé à son statut actuel.
      </p>

      {events.length === 0 ? (
        <EmptyState
          compact
          title="Aucun événement enregistré pour ce colis"
          description="L’historique s’affichera au fur et à mesure des étapes."
          icon={<IconInbox />}
        />
      ) : (
        <ol className={styles.timeline}>
          {events.map((event, index) => {
            const isLatest = index === events.length - 1;
            return (
              <li key={event.id} className={styles.item} data-latest={isLatest ? 'true' : 'false'}>
                <div className={styles.rail} aria-hidden>
                  <span className={styles.dot} />
                  {index < events.length - 1 ? <span className={styles.line} /> : null}
                </div>
                <div className={styles.body}>
                  <p className={styles.title}>{event.eventTypeLabel}</p>
                  <p className={styles.meta}>
                    {event.actorLabel} · {formatDateTime(event.createdAt)}
                  </p>
                  {event.summary ? <p className={styles.summary}>{event.summary}</p> : null}
                  {event.previousParcelStatus && event.newParcelStatus ? (
                    <p className={styles.transition}>
                      {(parcelStatusLabel
                        ? parcelStatusLabel(event.previousParcelStatus)
                        : PARCEL_STATUS_LABELS[event.previousParcelStatus])}{' '}
                      →{' '}
                      {parcelStatusLabel
                        ? parcelStatusLabel(event.newParcelStatus)
                        : PARCEL_STATUS_LABELS[event.newParcelStatus]}
                    </p>
                  ) : null}
                  {event.previousDeliveryStatus && event.newDeliveryStatus ? (
                    <p className={styles.transition}>
                      Livraison :{' '}
                      {deliveryStatusLabel
                        ? deliveryStatusLabel(event.previousDeliveryStatus)
                        : DELIVERY_STATUS_LABELS[event.previousDeliveryStatus]}{' '}
                      →{' '}
                      {deliveryStatusLabel
                        ? deliveryStatusLabel(event.newDeliveryStatus)
                        : DELIVERY_STATUS_LABELS[event.newDeliveryStatus]}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
