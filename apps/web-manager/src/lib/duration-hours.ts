export const HOURS_PER_DAY = 24;
export const MAX_DURATION_HOURS = 720;

export function clampDurationHours(totalHours: number, minHours: number, maxHours: number): number {
  if (!Number.isFinite(totalHours)) return minHours;
  return Math.min(maxHours, Math.max(minHours, Math.trunc(totalHours)));
}

export function splitDurationHours(totalHours: number): { days: number; hours: number } {
  const safe = Math.max(0, Math.trunc(totalHours));
  return {
    days: Math.floor(safe / HOURS_PER_DAY),
    hours: safe % HOURS_PER_DAY,
  };
}

export function combineDurationHours(
  days: number,
  hours: number,
  minHours: number,
  maxHours: number,
): number {
  return clampDurationHours(days * HOURS_PER_DAY + hours, minHours, maxHours);
}

export function durationDayOptions(minHours: number, maxHours: number): number[] {
  const minDays = Math.floor(Math.max(0, minHours) / HOURS_PER_DAY);
  const maxDays = Math.floor(Math.max(0, maxHours) / HOURS_PER_DAY);
  const options: number[] = [];
  for (let day = minDays; day <= maxDays; day += 1) options.push(day);
  return options;
}

export function durationHourOptions(days: number, minHours: number, maxHours: number): number[] {
  const minForDay = days === 0 ? Math.max(0, minHours) : 0;
  const maxForDay = Math.min(HOURS_PER_DAY - 1, Math.max(0, maxHours - days * HOURS_PER_DAY));
  const start = Math.min(minForDay, maxForDay);
  const options: number[] = [];
  for (let hour = start; hour <= maxForDay; hour += 1) options.push(hour);
  return options;
}

export function formatDurationHours(totalHours: number): string {
  const { days, hours } = splitDurationHours(Math.max(0, Math.trunc(totalHours)));
  const parts: string[] = [];
  if (days > 0) parts.push(days === 1 ? '1 jour' : `${days} jours`);
  if (hours > 0 || days === 0) {
    parts.push(hours === 1 ? '1 heure' : `${hours} heures`);
  }
  return parts.join(' ');
}
