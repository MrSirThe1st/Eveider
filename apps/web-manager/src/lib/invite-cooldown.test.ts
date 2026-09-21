import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INVITE_COOLDOWN_MS,
  inviteCooldownButtonLabel,
  inviteCooldownSecondsLeft,
  inviteCooldownStorageKey,
  inviteCooldownWaitMessage,
  normalizeInviteCooldownId,
  remainingInviteCooldownMs,
} from './invite-cooldown';

describe('invite cooldown helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes ids and builds a stable storage key', () => {
    expect(normalizeInviteCooldownId('  Jean@Eveider.cd ')).toBe('jean@eveider.cd');
    expect(inviteCooldownStorageKey('driver', 'ABC')).toBe('eveider:invite-cooldown:driver:abc');
  });

  it('counts remaining time in whole seconds', () => {
    expect(remainingInviteCooldownMs(1_000, 0)).toBe(1_000);
    expect(remainingInviteCooldownMs(500, 800)).toBe(0);
    expect(inviteCooldownSecondsLeft(29_001)).toBe(30);
    expect(inviteCooldownSecondsLeft(1)).toBe(1);
    expect(inviteCooldownSecondsLeft(0)).toBe(0);
  });

  it('keeps the idle label until a cooldown is active', () => {
    expect(inviteCooldownButtonLabel('Renvoyer l’invitation', 0)).toBe('Renvoyer l’invitation');
    expect(inviteCooldownButtonLabel('Inviter', INVITE_COOLDOWN_MS)).toBe('Réessayer dans 30 s');
  });

  it('explains how long to wait before retrying', () => {
    expect(inviteCooldownWaitMessage(30_000)).toBe(
      'Attendez 30 secondes avant de renvoyer l’invitation.',
    );
    expect(inviteCooldownWaitMessage(1)).toBe('Attendez 1 seconde avant de renvoyer l’invitation.');
  });
});
