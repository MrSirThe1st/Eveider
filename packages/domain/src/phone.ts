/** Democratic Republic of the Congo calling code (without +). */
export const DRC_CALLING_CODE = '243';

/** Fixed international prefix shown on every Eveider phone field. */
export const DRC_PHONE_PREFIX = `+${DRC_CALLING_CODE}` as const;

/** Strip everything except digits. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * National subscriber number for the DRC phone field.
 * Accepts pasted forms like `+243…`, `243…`, `0…`, or bare digits.
 */
export function toNationalPhoneDigits(value: string): string {
  let digits = phoneDigits(value);
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith(DRC_CALLING_CODE)) {
    digits = digits.slice(DRC_CALLING_CODE.length);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Canonical stored form: `+243` + national digits, or `''` when empty.
 */
export function toE164Phone(value: string): string {
  const national = toNationalPhoneDigits(value);
  return national ? `${DRC_PHONE_PREFIX}${national}` : '';
}

/** True when the national part has at least `minDigits` digits (default 9 for DRC mobiles). */
export function isCompleteDrcPhone(value: string, minDigits = 9): boolean {
  return toNationalPhoneDigits(value).length >= minDigits;
}
