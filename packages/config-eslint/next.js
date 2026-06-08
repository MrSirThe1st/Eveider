import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nextConfig = [
  ...baseConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
