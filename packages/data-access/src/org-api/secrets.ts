import { createHash, createHmac, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'eveider_live_';

export function generateOrganizationApiKey(): {
  plaintext: string;
  hash: string;
  prefix: string;
} {
  const plaintext = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
  return {
    plaintext,
    hash: hashOrganizationApiKey(plaintext),
    prefix: plaintext.slice(0, KEY_PREFIX.length + 4),
  };
}

export function hashOrganizationApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function generateNotificationSigningSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function signNotificationBody(signingSecret: string, body: string): string {
  return createHmac('sha256', signingSecret).update(body).digest('hex');
}

export function notificationSignatureHeader(signingSecret: string, body: string): string {
  return `sha256=${signNotificationBody(signingSecret, body)}`;
}

export function apiKeyLooksValid(plaintext: string): boolean {
  return plaintext.startsWith(KEY_PREFIX) && plaintext.length > KEY_PREFIX.length + 8;
}
