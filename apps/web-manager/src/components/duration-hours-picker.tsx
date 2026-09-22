'use client';

import { IconChevronDown, IconChevronUp } from '@eveider/ui';
import { useId } from 'react';
import {
  HOURS_PER_DAY,
  clampDurationHours,
  combineDurationHours,
  durationDayOptions,
  durationHourOptions,
  splitDurationHours,
} from '@/lib/duration-hours';

type DurationHoursPickerProps = {
  label: string;
  value: number;
  onChange: (hours: number) => void;
  minHours?: number;
  maxHours?: number;
  id?: string;
};

function padHour(hour: number): string {
  return String(hour).padStart(2, '0');
}

function StepButton({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string;
  direction: 'up' | 'down';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'up' ? IconChevronUp : IconChevronDown;
  return (
    <button
      type="button"
      className="duration-hours-picker__step"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon width={16} height={16} aria-hidden />
    </button>
  );
}

export function DurationHoursPicker({
  label,
  value,
  onChange,
  minHours = 0,
  maxHours = 720,
  id,
}: DurationHoursPickerProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const daysId = `${fieldId}-days`;
  const hoursId = `${fieldId}-hours`;
  const clamped = clampDurationHours(value, minHours, maxHours);
  const { days, hours } = splitDurationHours(clamped);
  const dayOptions = durationDayOptions(minHours, maxHours);
  const hourOptions = durationHourOptions(days, minHours, maxHours);
  const selectedHours = hourOptions.includes(hours) ? hours : (hourOptions[0] ?? 0);
  const canDecrease = clamped > minHours;
  const canIncrease = clamped < maxHours;

  function commit(nextDays: number, nextHours: number) {
    onChange(combineDurationHours(nextDays, nextHours, minHours, maxHours));
  }

  function stepBy(delta: number) {
    onChange(clampDurationHours(clamped + delta, minHours, maxHours));
  }

  return (
    <div className="ops-field">
      <span className="ops-field-label" id={`${fieldId}-label`}>
        {label}
      </span>
      <div
        className="duration-hours-picker"
        role="group"
        aria-labelledby={`${fieldId}-label`}
      >
        <div className="duration-hours-picker__col">
          <StepButton
            direction="up"
            label="Augmenter les jours"
            disabled={!canIncrease}
            onClick={() => stepBy(HOURS_PER_DAY)}
          />
          <select
            id={daysId}
            aria-label="Jours"
            value={days}
            onChange={(event) => commit(Number(event.target.value), hours)}
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <StepButton
            direction="down"
            label="Diminuer les jours"
            disabled={!canDecrease}
            onClick={() => stepBy(-HOURS_PER_DAY)}
          />
          <span className="duration-hours-picker__unit">{days === 1 ? 'jour' : 'jours'}</span>
        </div>
        <span className="duration-hours-picker__colon" aria-hidden>
          :
        </span>
        <div className="duration-hours-picker__col">
          <StepButton
            direction="up"
            label="Augmenter les heures"
            disabled={!canIncrease}
            onClick={() => stepBy(1)}
          />
          <select
            id={hoursId}
            aria-label="Heures"
            value={selectedHours}
            onChange={(event) => commit(days, Number(event.target.value))}
          >
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {padHour(hour)}
              </option>
            ))}
          </select>
          <StepButton
            direction="down"
            label="Diminuer les heures"
            disabled={!canDecrease}
            onClick={() => stepBy(-1)}
          />
          <span className="duration-hours-picker__unit">{hours === 1 ? 'heure' : 'heures'}</span>
        </div>
      </div>
    </div>
  );
}
