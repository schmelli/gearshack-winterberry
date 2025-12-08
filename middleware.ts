/**
 * i18n Middleware
 *
 * Feature: 027-i18n-next-intl, 037-final-stabilization
 * DR-007: Locale detection and routing middleware
 *
 * Handles:
 * - Browser language detection (Accept-Language header)
 * - Redirect root URL (/) to default locale (/en/)
 * - Redirect non-prefixed paths (/inventory) to locale-prefixed (/en/inventory)
 * - Locale prefix in URLs
 */

import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
});

export const config = {
  // Match only internationalized pathnames
  // This pattern ensures /inventory redirects to /en/inventory
  matcher: ['/', '/(de|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
