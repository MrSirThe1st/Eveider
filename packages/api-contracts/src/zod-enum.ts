import { z } from 'zod';

export function zodEnum<T extends string>(values: readonly T[]) {
  if (values.length === 0) {
    throw new Error('zodEnum requires at least one value');
  }
  const [first, ...rest] = values;
  return z.enum([first, ...rest] as [T, ...T[]]);
}
