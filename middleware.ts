/**
 * i18n Middleware
 *
 * Feature: 027-i18n-next-intl
 * DR-007: Locale detection and routing middleware
 *
 * Handles:
 * - Browser language detection (Accept-Language header)
 * - Redirect root URL (/) to default locale (/en/)
 * - Redirect unknown locales to default
 * - Locale prefix in URLs
 */

import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  // Match root and locale-prefixed paths
  matcher: ['/', '/(de|en)/:path*'],
};
