import { baseConfig, domainBoundaryRules, packageBoundaryRules } from '@eveider/config-eslint/base';

/** @type {import('eslint').Linter.Config[]} */
export default [...baseConfig, packageBoundaryRules, domainBoundaryRules];
