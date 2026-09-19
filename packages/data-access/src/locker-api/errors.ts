import type { LockerDenialReason } from '@eveider/domain';

export class LockerAuthorizationError extends Error {
  readonly code: LockerDenialReason;

  constructor(code: LockerDenialReason, message?: string) {
    super(message ?? code);
    this.name = 'LockerAuthorizationError';
    this.code = code;
  }
}
