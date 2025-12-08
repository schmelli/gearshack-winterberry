/**
 * i18n Navigation Utilities
 *
 * Feature: 027-i18n-next-intl
 * DR-006: Use next-intl's locale-aware navigation components
 *
 * Exports locale-aware Link, redirect, usePathname, useRouter.
 * Use these instead of next/link and next/navigation for locale preservation.
 */

import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
});
