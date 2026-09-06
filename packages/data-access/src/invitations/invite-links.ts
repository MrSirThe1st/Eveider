const DEFAULT_DEEP_LINK_SCHEME = 'eveider';
/** Production portal — set INVITE_WEB_BASE_URL=http://localhost:3000 for local-only invite testing. */
const DEFAULT_WEB_BASE_URL = 'https://www.eveider.com';

function isLocalWebBase(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function resolveWebBaseUrl(): string {
  const invite = process.env.INVITE_WEB_BASE_URL?.trim();
  if (invite) return invite.replace(/\/$/, '');

  const portal = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (portal && !isLocalWebBase(portal)) return portal.replace(/\/$/, '');

  return DEFAULT_WEB_BASE_URL;
}

export type InviteLinks = {
  deepLink: string;
  webLink: string;
  token: string;
};

export function getInviteConfig() {
  return {
    deepLinkScheme: process.env.INVITE_DEEP_LINK_SCHEME ?? DEFAULT_DEEP_LINK_SCHEME,
    webBaseUrl: resolveWebBaseUrl(),
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

export function buildTeamInviteLink(token: string): string {
  const { webBaseUrl } = getInviteConfig();
  return `${webBaseUrl}/invite/equipe/${token}`;
}

export function buildPlatformAdminInviteLink(token: string): string {
  const { webBaseUrl } = getInviteConfig();
  return `${webBaseUrl}/invite/admin/${token}`;
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
