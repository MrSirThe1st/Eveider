export type ResendConfig = {
  apiKey: string;
  from: string;
};

const DEFAULT_FROM = 'Eveider <beth.t@example.com>';

/** Returns null when Resend is not configured. */
export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM,
  };
}
