/**
 * i18n Request Configuration
 *
 * Feature: 027-i18n-next-intl
 * DR-002: Server-side request configuration for next-intl
 *
 * Provides locale and messages for server components via getRequestConfig.
 * Merges main messages with additional namespaced files (vip, bulletin).
 */

import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en';
  }

  // Load main messages file
  const mainMessages = (await import(`../messages/${locale}.json`)).default;

  // Load additional namespaced message files
  let vipMessages = {};
  let bulletinMessages = {};
  let communityMessages = {};

  try {
    vipMessages = (await import(`../messages/${locale}/vip.json`)).default;
  } catch {
    // VIP messages file not found for this locale, use empty object
  }

  try {
    bulletinMessages = (await import(`../messages/${locale}/bulletin.json`))
      .default;
  } catch {
    // Bulletin messages file not found for this locale, use empty object
  }

  try {
    communityMessages = (await import(`../messages/${locale}/community.json`))
      .default;
  } catch {
    // Community messages file not found for this locale, use empty object
  }

  return {
    locale,
    messages: {
      ...mainMessages,
      vip: vipMessages,
      bulletin: bulletinMessages,
      // Merge community.json into the Community namespace from mainMessages
      // (not replace) to preserve mainMessages.Community keys like "meta"
      Community: {
        ...((mainMessages as Record<string, unknown>).Community as Record<string, unknown> ?? {}),
        ...(communityMessages as Record<string, unknown>),
      },
    },
  };
});
