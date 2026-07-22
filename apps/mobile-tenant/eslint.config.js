import { reactNativeConfig } from '@eveider/config-eslint/react-native';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...reactNativeConfig,
  {
    ignores: ['babel.config.js', 'metro.config.js', 'index.js'],
  },
];
