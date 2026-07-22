import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@eveider/domain',
    '@eveider/api-contracts',
    '@eveider/data-access',
    '@eveider/config-ui',
    '@eveider/ui',
  ],
  serverExternalPackages: ['pg'],
};

export default nextConfig;
