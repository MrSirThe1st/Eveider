import { colors, webCardStyle } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS, PARCEL_STATUS_LABELS } from '@eveider/domain';
import type { AdminParcelEventDto } from '@/lib/parcel-presenter';

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

type ParcelEventTimelineProps = {
  events: AdminParcelEventDto[];
  /** Optional tighter card padding for denser layouts. */
  compact?: boolean;
};

export function ParcelEventTimeline({ events, compact = false }: ParcelEventTimelineProps) {
  return (
    <section
      style={{
        ...webCardStyle,
        padding: compact ? '1.5rem' : '2rem',
        marginTop: '1.25rem',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Historique</h3>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>
        Comment ce colis est arrivé à son statut actuel.
      </p>

      {events.length === 0 ? (
        <p style={{ margin: '1.5rem 0 0', fontWeight: 500, fontSize: '0.875rem' }}>
          Aucun événement enregistré pour ce colis.
        </p>
      ) : (
        <ol
          style={{
            margin: '1.5rem 0 0',
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: '1rem',
          }}
        >
          {events.map((event, index) => (
            <li
              key={event.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '0.85rem',
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  marginTop: 6,
                  borderRadius: '50%',
                  background: colors.secondary,
                  opacity: index === events.length - 1 ? 1 : 0.45,
                }}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>
                  {event.eventTypeLabel}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.8 }}>
                  {event.actorLabel} · {formatDateTime(event.createdAt)}
                </p>
                {event.summary ? (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>
                    {event.summary}
                  </p>
                ) : null}
                {event.previousParcelStatus && event.newParcelStatus ? (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.65 }}>
                    {PARCEL_STATUS_LABELS[event.previousParcelStatus]} →{' '}
                    {PARCEL_STATUS_LABELS[event.newParcelStatus]}
                  </p>
                ) : null}
                {event.previousDeliveryStatus && event.newDeliveryStatus ? (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.65 }}>
                    Livraison : {DELIVERY_STATUS_LABELS[event.previousDeliveryStatus]} →{' '}
                    {DELIVERY_STATUS_LABELS[event.newDeliveryStatus]}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
