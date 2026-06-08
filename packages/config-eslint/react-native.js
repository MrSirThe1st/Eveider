import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const reactNativeConfig = [
  ...baseConfig,
  {
    ignores: ['.expo/**'],
  },
];
