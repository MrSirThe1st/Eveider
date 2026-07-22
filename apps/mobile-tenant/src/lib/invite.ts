import { Linking } from 'react-native';
import { apiFetch } from './api-fetch';

export type InvitePreview = {
  business: string;
  recipientPhone: string;
  recipientName: string | null;
  parcel: {
    id: string;
    reference: string;
    locker: string | null;
  };
};

const INVITE_PATH = /\/invite\/([0-9a-f-]{36})/i;

export function parseInviteToken(url: string | null | undefined): string | null {
  if (!url) return null;

  const match = url.match(INVITE_PATH);
  return match?.[1] ?? null;
}

export async function fetchInvitePreview(token: string) {
  return apiFetch<{ invite: InvitePreview }>(`/api/invite/${token}`);
}

export async function acceptInvite(token: string, accessToken: string) {
  return apiFetch<{ accepted: true }>(`/api/invite/${token}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function resolveInitialInviteToken(): Promise<string | null> {
  const initialUrl = await Linking.getInitialURL();
  return parseInviteToken(initialUrl);
}
