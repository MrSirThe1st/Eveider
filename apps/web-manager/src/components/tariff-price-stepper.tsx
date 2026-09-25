'use client';

import { CHARGE_PAYER_LABELS, type ChargePayer } from '@eveider/domain';
import { useState } from 'react';
import {
  formatTariffPickerLabel,
  parsePriceInput,
  stepTariffAmount,
  TARIFF_AMOUNT_MAX,
} from '@/lib/geography-presentation';
import styles from './tariff-price-stepper.module.css';

type TariffPriceStepperProps = {
  id: string;
  label: string;
  hint: string;
  /** Who is billed for this fee under the canonical commercial model. */
  payer: ChargePayer;
  ariaLabel: string;
  amount: number | null;
  currency: 'USD' | 'CDF';
  /** Zone transport can be cleared back to “non configuré”. Locker fees cannot. */
  nullable?: boolean;
  onChange: (amount: number | null) => void;
};

function liveAmount(
  amount: number | null,
  draft: string | null,
  nullable: boolean,
): number | null {
  if (draft == null) return amount;
  if (draft.trim() === '') return nullable ? null : amount;
  return parsePriceInput(draft) ?? amount;
}

export function TariffPriceStepper({
  id,
  label,
  hint,
  payer,
  ariaLabel,
  amount,
  currency,
  nullable = false,
  onChange,
}: TariffPriceStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const live = liveAmount(amount, draft, nullable);
  const display = formatTariffPickerLabel(live, currency);
  const shown = draft ?? (amount == null ? '' : String(amount));
  const minusDisabled = live == null || (!nullable && live <= 0);
  const payerLabel = CHARGE_PAYER_LABELS[payer];
  const hintId = `${id}-hint`;
  const payerId = `${id}-payer`;
  const priceId = `${id}-price`;

  function commit(raw: string) {
    const parsed = parsePriceInput(raw);
    if (parsed == null) {
      onChange(nullable ? null : 0);
      return;
    }
    onChange(Math.min(parsed, TARIFF_AMOUNT_MAX));
  }

  function adjust(direction: 1 | -1) {
    const base = draft == null ? amount : parsePriceInput(draft);
    onChange(stepTariffAmount(base, direction, currency, nullable));
    setDraft(null);
  }

  return (
    <div>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
      <div className={styles.metaRow}>
        <p id={payerId} className={styles.payer}>
          Payé par : <span className={styles.payerValue}>{payerLabel}</span>
        </p>
        <p id={priceId} className={styles.price} data-unset={live == null ? 'true' : 'false'}>
          {display}
        </p>
      </div>
      <div className={styles.row}>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.button}
            aria-label={`Diminuer ${ariaLabel}`}
            disabled={minusDisabled}
            onClick={() => adjust(-1)}
          >
            −
          </button>
          <input
            id={id}
            className={styles.amountInput}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={shown}
            aria-label={ariaLabel}
            aria-describedby={`${hintId} ${payerId} ${priceId}`}
            onFocus={() => setDraft(amount == null ? '' : String(amount))}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft(raw);
              if (raw.trim() === '') {
                onChange(nullable ? null : amount);
                return;
              }
              const parsed = parsePriceInput(raw);
              if (parsed != null) onChange(Math.min(parsed, TARIFF_AMOUNT_MAX));
            }}
            onBlur={() => {
              if (draft != null) commit(draft);
              setDraft(null);
            }}
          />
          <button
            type="button"
            className={styles.button}
            aria-label={`Augmenter ${ariaLabel}`}
            disabled={(live ?? 0) >= TARIFF_AMOUNT_MAX}
            onClick={() => adjust(1)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
