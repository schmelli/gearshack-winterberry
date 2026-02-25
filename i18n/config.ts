/**
 * i18n Configuration
 *
 * Feature: 027-i18n-next-intl
 * DR-002: Centralize i18n configuration in i18n/ directory
 *
 * Defines supported locales and default locale for the application.
 */

export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];
