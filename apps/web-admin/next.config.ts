import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@eveider/domain',
    '@eveider/api-contracts',
    '@eveider/config-ui',
    '@eveider/ui',
  ],
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
