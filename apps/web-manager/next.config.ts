import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    '@eveider/domain',
    '@eveider/api-contracts',
    '@eveider/data-access',
    '@eveider/config-ui',
    '@eveider/ui',
  ],
  serverExternalPackages: ['pg'],
  // Client inlining — root `.env` is loaded by `dotenv -e ../../.env` in scripts / Vercel env.
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL ?? '',
  },
  async redirects() {
    return [
      { source: '/entreprise/:path*', destination: '/organisation/:path*', permanent: true },
      { source: '/api/entreprise/:path*', destination: '/api/organisation/:path*', permanent: false },
      { source: '/api/courier/:path*', destination: '/api/driver/:path*', permanent: false },
      { source: '/tableau-de-bord/entreprises/:path*', destination: '/tableau-de-bord/organisations/:path*', permanent: true },
      { source: '/tableau-de-bord/entreprises', destination: '/tableau-de-bord/organisations', permanent: true },
      { source: '/tableau-de-bord/coursiers', destination: '/tableau-de-bord/chauffeurs', permanent: true },
      {
        source: '/organisation/tableau-de-bord/facturation',
        destination: '/organisation/tableau-de-bord/parametres/facturation',
        permanent: true,
      },
      {
        source: '/organisation/tableau-de-bord/equipe',
        destination: '/organisation/tableau-de-bord/parametres/membres',
        permanent: true,
      },
      {
        source: '/tableau-de-bord/organisations/applications',
        destination: '/tableau-de-bord/organisations/verification',
        permanent: true,
      },
      {
        source: '/tableau-de-bord/organisations/applications/:id',
        destination: '/tableau-de-bord/organisations/:id/verification/dossier',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
