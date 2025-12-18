import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Feature 027: i18n with next-intl
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Note: instrumentationHook is no longer needed in Next.js 16 (Feature 050: OpenTelemetry)
  images: {
    // Feature 025: Allow all HTTPS domains for external product images
    // Users need to paste image URLs from any retailer (fjellsport.no, REI, etc.)
    // Feature 038: Explicit Cloudinary CDN support
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Feature 026: Enable WASM support for @imgly/background-removal
  webpack: (config) => {
    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Allow WASM files to be imported
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Ensure WASM files are not processed by the default file loader
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "gearshack",

  project: "gearshack-winterberry",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // Disabled: Conflicts with [locale] routing and causes 405 errors
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});