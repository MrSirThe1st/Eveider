import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@eveider/domain',
    '@eveider/api-contracts',
    '@eveider/config-ui',
    '@eveider/ui',
  ],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: `${portalUrl}/:path*`,
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
