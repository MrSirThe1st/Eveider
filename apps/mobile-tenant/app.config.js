const path = require('path');
const { load } = require('@expo/env');

// Local: load EXPO_PUBLIC_* from monorepo root .env (same file as Next.js apps).
// EAS: skip — use Environment variables / eas.json env (no root .env on the builder).
if (!process.env.EAS_BUILD) {
  load(path.resolve(__dirname, '../..'));
}

const REQUIRED_EAS_PUBLIC_ENV = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_AUTH_API_URL',
];

module.exports = ({ config }) => {
  if (process.env.EAS_BUILD) {
    const missing = REQUIRED_EAS_PUBLIC_ENV.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `Missing ${missing.join(', ')} for EAS build. Add them on expo.dev → Environment variables (preview/production) or with eas env:create.`,
      );
    }
  }

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
