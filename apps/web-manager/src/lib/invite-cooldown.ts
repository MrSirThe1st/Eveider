import { useCallback, useEffect, useState } from 'react';

export const INVITE_COOLDOWN_MS = 30_000;
const STORAGE_PREFIX = 'eveider:invite-cooldown:';

export function normalizeInviteCooldownId(id: string): string {
  return id.trim().toLowerCase();
}

export function inviteCooldownStorageKey(scope: string, id: string): string {
  return `${STORAGE_PREFIX}${scope}:${normalizeInviteCooldownId(id)}`;
}

export function remainingInviteCooldownMs(until: number, now = Date.now()): number {
  return Math.max(0, until - now);
}

export function inviteCooldownSecondsLeft(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function inviteCooldownButtonLabel(idleLabel: string, remainingMs: number): string {
  const seconds = inviteCooldownSecondsLeft(remainingMs);
  if (seconds <= 0) return idleLabel;
  return `Réessayer dans ${seconds} s`;
}

export function inviteCooldownWaitMessage(remainingMs: number): string {
  const seconds = inviteCooldownSecondsLeft(remainingMs);
  if (seconds <= 1) {
    return 'Attendez 1 seconde avant de renvoyer l’invitation.';
  }
  return `Attendez ${seconds} secondes avant de renvoyer l’invitation.`;
}

export function readInviteCooldownUntil(scope: string, id: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = sessionStorage.getItem(inviteCooldownStorageKey(scope, id));
  const until = Number(raw);
  return Number.isFinite(until) ? until : 0;
}

export function writeInviteCooldown(
  scope: string,
  id: string,
  durationMs = INVITE_COOLDOWN_MS,
): number {
  const until = Date.now() + durationMs;
  sessionStorage.setItem(inviteCooldownStorageKey(scope, id), String(until));
  return until;
}

export function useInviteCooldowns(scope: string) {
  const [now, setNow] = useState(0);
  const [untilById, setUntilById] = useState<Record<string, number>>({});
  const [noticeId, setNoticeId] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = useCallback(
    (id: string) => {
      const key = normalizeInviteCooldownId(id);
      const until = untilById[key] ?? readInviteCooldownUntil(scope, key);
      return remainingInviteCooldownMs(until, now || Date.now());
    },
    [now, scope, untilById],
  );

  const start = useCallback(
    (...ids: string[]) => {
      const until = Date.now() + INVITE_COOLDOWN_MS;
      setUntilById((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          const key = normalizeInviteCooldownId(id);
          if (!key) continue;
          sessionStorage.setItem(inviteCooldownStorageKey(scope, key), String(until));
          next[key] = until;
        }
        return next;
      });
    },
    [scope],
  );

  const guard = useCallback(
    (id: string) => {
      const left = remainingMs(id);
      if (left <= 0) {
        setNoticeId((current) =>
          current === normalizeInviteCooldownId(id) ? null : current,
        );
        return true;
      }
      setNoticeId(normalizeInviteCooldownId(id));
      return false;
    },
    [remainingMs],
  );

  const noticeRemainingMs = noticeId ? remainingMs(noticeId) : 0;

  useEffect(() => {
    if (noticeId && noticeRemainingMs <= 0) setNoticeId(null);
  }, [noticeId, noticeRemainingMs]);

  return {
    now,
    remainingMs,
    isCooling: (id: string) => remainingMs(id) > 0,
    start,
    guard,
    waitMessage:
      noticeRemainingMs > 0 ? inviteCooldownWaitMessage(noticeRemainingMs) : null,
    buttonLabel: (id: string, idleLabel: string) =>
      inviteCooldownButtonLabel(idleLabel, remainingMs(id)),
  };
}
