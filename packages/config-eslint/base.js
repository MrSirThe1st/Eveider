import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/no-cycle': 'error',
    },
  },
];

/** Domain layer: framework-free, no upward imports. */
/** @type {import('eslint').Linter.Config} */
export const domainBoundaryRules = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react', 'react/*', 'next', 'next/*', 'expo', 'expo/*', '@eveider/ui'],
            message: 'Domain package must stay framework-free.',
          },
          {
            group: ['@eveider/data-access', '@eveider/data-access/*'],
            message: 'Domain must not import from data-access (infrastructure).',
          },
        ],
      },
    ],
  },
};

/** Packages must not import from apps. */
/** @type {import('eslint').Linter.Config} */
export const packageBoundaryRules = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/**', 'apps/*'],
            message: 'Packages cannot import from apps.',
          },
        ],
      },
    ],
  },
};
