import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Feature 027: i18n with next-intl
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Feature 025: Allow all HTTPS domains for external product images
    // Users need to paste image URLs from any retailer (fjellsport.no, REI, etc.)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
