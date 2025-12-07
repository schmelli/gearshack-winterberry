import type { NextConfig } from "next";

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

export default nextConfig;