'use client';

import { webInputStyle } from '@eveider/config-ui';
import type { ShipmentPickupType } from '@eveider/domain';
import { getFulfillmentMethodLabel } from '@/lib/business-presentation';
import Link from 'next/link';
import type { CSSProperties, FormEvent, ReactNode, SelectHTMLAttributes } from 'react';

type OpsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** When set, used as the section accessible name; defaults to `title`. */
  label?: string;
};

export function OpsSection({ title, description, children, label }: OpsSectionProps) {
  return (
    <section className="ops-section" aria-label={label ?? title}>
      <header className="ops-section__header">
        <h2 className="ops-section__title">{title}</h2>
        {description ? <p className="ops-section__description">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function OpsPanel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={['ops-panel', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}

export type OpsStatItem = {
  label: string;
  value: number | string;
  href: string;
};

export function OpsStatStrip({ items }: { items: OpsStatItem[] }) {
  return (
    <ul className="ops-stat-strip">
      {items.map((item) => (
        <li key={item.label}>
          <Link href={item.href} className="ops-stat-strip__item">
            <span className="ops-stat-strip__label">{item.label}</span>
            <span className="ops-stat-strip__value">{item.value}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type OpsActionItem = {
  label: string;
  hint: string;
  href: string;
  count?: number;
  value?: string;
  accent?: boolean;
};

export function OpsActionList({ items }: { items: OpsActionItem[] }) {
  const hasWork = items.some((item) => (item.count ?? 0) > 0 || Boolean(item.value));

  return (
    <div className="ops-action-list-wrap">
      {!hasWork ? (
        <p className="ops-action-list__idle" role="status">
          Rien à traiter pour le moment.
        </p>
      ) : null}
      <ul className="ops-action-list">
        {items.map((item) => {
          const count = item.count ?? 0;
          const display = item.value ?? String(count);
          const quiet = count === 0;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={[
                  'ops-action-list__row',
                  quiet ? 'is-quiet' : null,
                  item.accent && count > 0 ? 'is-accent' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="ops-action-list__copy">
                  <span className="ops-action-list__label">{item.label}</span>
                  <span className="ops-action-list__hint">{item.hint}</span>
                </span>
                <span className="ops-action-list__value">{display}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OpsToolbar({ children }: { children: ReactNode }) {
  return <div className="ops-toolbar">{children}</div>;
}

export function FulfillmentMethodTag({ pickupType }: { pickupType: ShipmentPickupType }) {
  const variant = pickupType === 'merchant_dropoff' ? 'depot' : 'collecte';
  return (
    <span className={`ops-method-tag ops-method-tag--${variant}`}>
      {getFulfillmentMethodLabel(pickupType)}
    </span>
  );
}

export function SettingsForm({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="ops-form" onSubmit={onSubmit}>
      {children}
    </form>
  );
}

export function SettingsFormSection({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="ops-form-section">
      <header className="ops-form-section__header">
        <div className="ops-form-section__heading">
          <h2 className="ops-form-section__title">{title}</h2>
          {badge ? <span className="ops-form-section__badge">{badge}</span> : null}
        </div>
        {description ? <p className="ops-form-section__description">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function SettingsFormActions({ children }: { children: ReactNode }) {
  return <div className="ops-form-actions">{children}</div>;
}

export function SettingsFieldGrid({
  children,
  columns = 'auto',
}: {
  children: ReactNode;
  /** Prefer two columns for address-heavy content; auto keeps the denser fit. */
  columns?: 'auto' | 2;
}) {
  return (
    <div className={columns === 2 ? 'ops-field-grid ops-field-grid--two' : 'ops-field-grid'}>
      {children}
    </div>
  );
}

export function SettingsSelect({
  label,
  id,
  children,
  ...rest
}: {
  label: string;
  id?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? rest.name;
  return (
    <label className="ops-field" htmlFor={fieldId}>
      <span className="ops-field-label">{label}</span>
      <select id={fieldId} className="nb-input" style={{ ...webInputStyle, width: '100%', height: 44 }} {...rest}>
        {children}
      </select>
    </label>
  );
}
