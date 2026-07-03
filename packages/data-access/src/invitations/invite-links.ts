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
