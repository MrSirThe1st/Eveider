const fs = require('fs');
const path = require('path');

// Local only: load EXPO_PUBLIC_* from monorepo root .env.
// Do not require @expo/env on EAS — NODE_ENV=production omits it (devDependency).
if (!process.env.EAS_BUILD) {
  const { load } = require('@expo/env');
  load(path.resolve(__dirname, '../..'));
}

const REQUIRED_EAS_PUBLIC_ENV = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_AUTH_API_URL',
];

const GOOGLE_SERVICES_PATH = path.resolve(__dirname, 'google-services.json');

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
  const hasGoogleServices = fs.existsSync(GOOGLE_SERVICES_PATH);

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
      ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
