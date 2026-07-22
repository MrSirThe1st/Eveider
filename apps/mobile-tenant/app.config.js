const path = require('path');
const { load } = require('@expo/env');

// Load EXPO_PUBLIC_* from monorepo root .env (same file as Next.js apps)
load(path.resolve(__dirname, '../..'));

module.exports = ({ config }) => {
  return {
    ...config,
  };
};
