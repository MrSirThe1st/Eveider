const DEFAULT_DEEP_LINK_SCHEME = 'eveider';
const DEFAULT_WEB_BASE_URL = 'http://localhost:3000';

export type InviteLinks = {
  deepLink: string;
  webLink: string;
  token: string;
};

export function getInviteConfig() {
  return {
    deepLinkScheme: process.env.INVITE_DEEP_LINK_SCHEME ?? DEFAULT_DEEP_LINK_SCHEME,
    webBaseUrl: (process.env.INVITE_WEB_BASE_URL ?? DEFAULT_WEB_BASE_URL).replace(/\/$/, ''),
  };
}

export function buildInviteLinks(token: string): InviteLinks {
  const { deepLinkScheme, webBaseUrl } = getInviteConfig();
  return {
    token,
    deepLink: `${deepLinkScheme}://invite/${token}`,
    webLink: `${webBaseUrl}/invite/${token}`,
  };
}

/** Public guest tracking page — no account required. */
export function buildParcelTrackLink(input: {
  trackingNumber?: string;
  reference?: string;
  phone?: string;
}): string {
  const { webBaseUrl } = getInviteConfig();
  const params = new URLSearchParams();
  if (input.trackingNumber) {
    params.set('mode', 'tracking');
    params.set('tracking', input.trackingNumber);
  } else if (input.reference && input.phone) {
    params.set('ref', input.reference);
    params.set('phone', input.phone);
  }
  return `${webBaseUrl}/suivi?${params.toString()}`;
}

/**
 * Web link for parcel pickup / tracking.
 * Prefers guest track page by tracking number; falls back to invite or /suivi.
 */
export function buildParcelPickupLink(
  inviteToken?: string | null,
  track?: { trackingNumber?: string; reference?: string; phone?: string } | null,
): string {
  if (track?.trackingNumber) {
    return buildParcelTrackLink({ trackingNumber: track.trackingNumber });
  }
  if (track?.reference && track.phone) {
    return buildParcelTrackLink(track);
  }
  const { webBaseUrl } = getInviteConfig();
  if (inviteToken) {
    return `${webBaseUrl}/invite/${inviteToken}`;
  }
  return `${webBaseUrl}/suivi`;
}
