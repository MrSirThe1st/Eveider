import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/*': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**',
    ],
    '/api/**': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**',
    ],
  },
  transpilePackages: [
    '@eveider/domain',
    '@eveider/api-contracts',
    '@eveider/config-ui',
    '@eveider/ui',
  ],
  serverExternalPackages: ['@prisma/client', 'prisma', '@eveider/data-access'],
};

export default nextConfig;
