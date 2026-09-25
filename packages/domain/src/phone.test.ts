import { describe, expect, it } from 'vitest';
import {
  DRC_PHONE_PREFIX,
  isCompleteDrcPhone,
  phoneDigits,
  toE164Phone,
  toNationalPhoneDigits,
} from './phone.js';

describe('phone helpers', () => {
  it('strips non-digits', () => {
    expect(phoneDigits('+243 810-000-000')).toBe('243810000000');
  });

  it('normalizes common DRC input shapes to national digits', () => {
    expect(toNationalPhoneDigits('+243810000000')).toBe('810000000');
    expect(toNationalPhoneDigits('243810000000')).toBe('810000000');
    expect(toNationalPhoneDigits('0810000000')).toBe('810000000');
    expect(toNationalPhoneDigits('810 000 000')).toBe('810000000');
    expect(toNationalPhoneDigits('')).toBe('');
  });

  it('builds E.164 with a fixed +243 prefix', () => {
    expect(toE164Phone('810000000')).toBe(`${DRC_PHONE_PREFIX}810000000`);
    expect(toE164Phone('0991234567')).toBe(`${DRC_PHONE_PREFIX}991234567`);
    expect(toE164Phone('+243 99 123 4567')).toBe(`${DRC_PHONE_PREFIX}991234567`);
    expect(toE164Phone('')).toBe('');
  });

  it('checks completeness on national length', () => {
    expect(isCompleteDrcPhone('+243810000000')).toBe(true);
    expect(isCompleteDrcPhone('810')).toBe(false);
  });
});
