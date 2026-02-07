import {withSentryConfig} from '@sentry/nextjs';
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Feature 027: i18n with next-intl
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Note: instrumentationHook is no longer needed in Next.js 16 (Feature 050: OpenTelemetry)

  // Remove console logs in production (except warn/error)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['warn', 'error'],
    } : false,
  },

  // Externalize packages that have Node.js-only deps or WASM that webpack can't handle
  serverExternalPackages: [
    '@imgly/background-removal',
    'onnxruntime-web',
    'pino',
    'pino-pretty',
    'thread-stream',
    'prom-client',
  ],

  images: {
    // Feature 038: Cloudinary CDN for user uploads
    // Feature 040: Supabase storage for app data
    // Google auth: User avatars from Google accounts
    // Feature 030/039: Serper API image search thumbnails (Google CDN)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn1.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn2.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn3.gstatic.com',
      },
    ],
    minimumCacheTTL: 60,
  },
  // Feature 026: Enable WASM support for @imgly/background-removal
  webpack: (config, { isServer }) => {
    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Ignore test files in node_modules (fixes thread-stream/tap issue)
    config.module.rules.push({
      test: /node_modules[\\/].*\.test\.(js|ts)$/,
      loader: 'ignore-loader',
    });

    // Externalize @imgly/background-removal and onnxruntime-web on server
    // These packages use WASM which causes bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@imgly/background-removal');
      config.externals.push('onnxruntime-web');
    }

    // For client builds, exclude WASM files from onnxruntime-web
    // to prevent webpack from trying to parse them as JavaScript
    config.module.rules.push({
      test: /onnxruntime-web.*\.wasm$/,
      type: 'asset/resource',
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

  // Bundle size optimizations (replaces deprecated disableLogger)
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  // Webpack-specific options
  webpack: {
    // Cron monitoring (replaces deprecated top-level automaticVercelMonitors)
    // Note: Does not yet work with App Router route handlers.
    // See: https://docs.sentry.io/product/crons/
    automaticVercelMonitors: true,
  },
});