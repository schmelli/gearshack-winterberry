/**
 * Non-React Translation Utility
 *
 * Feature: i18n compliance
 * Purpose: Provides translation access for code running outside React context
 *          (e.g., zustand stores, utility functions)
 *
 * Usage:
 * ```typescript
 * import { getTranslation } from '@/lib/translations';
 *
 * const t = getTranslation('Store');
 * toast.error(t('signInRequired'));
 * ```
 */

import enMessages from '@/messages/en.json';
import deMessages from '@/messages/de.json';

// Type-safe message structure
type Messages = typeof enMessages;

// Message dictionaries by locale
const messages: Record<string, Messages> = {
  en: enMessages,
  de: deMessages,
};

/**
 * Gets the current locale from the URL path or defaults to 'en'
 * Works in browser context only
 */
function getCurrentLocale(): string {
  if (typeof window === 'undefined') {
    return 'en';
  }

  // Extract locale from URL path (e.g., /de/inventory -> 'de')
  const pathParts = window.location.pathname.split('/');
  const urlLocale = pathParts[1];

  if (urlLocale === 'de' || urlLocale === 'en') {
    return urlLocale;
  }

  // Fallback to browser language preference
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'de' ? 'de' : 'en';
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Creates a translation function for a specific namespace
 *
 * @param namespace - The translation namespace (e.g., 'Store', 'Common')
 * @returns A function that translates keys within that namespace
 *
 * @example
 * const t = getTranslation('Store');
 * t('signInRequired') // Returns "Please sign in to add items"
 * t('itemSaved', { name: 'Tent' }) // Returns "Tent saved successfully"
 */
export function getTranslation(namespace: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    const locale = getCurrentLocale();
    const localeMessages = messages[locale] || messages.en;

    // Build full path: namespace.key
    const fullPath = `${namespace}.${key}`;
    let translation = getNestedValue(localeMessages as Record<string, unknown>, fullPath);

    // Fallback to English if translation not found
    if (!translation && locale !== 'en') {
      translation = getNestedValue(messages.en as Record<string, unknown>, fullPath);
    }

    // If still not found, return the key
    if (!translation) {
      console.warn(`[i18n] Missing translation: ${fullPath}`);
      return key;
    }

    // Handle parameter interpolation: {param} -> value
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation!.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };
}

/**
 * Direct translation access without namespace
 *
 * @param fullPath - The full path including namespace (e.g., 'Store.signInRequired')
 * @returns The translated string
 */
export function translate(fullPath: string, params?: Record<string, string | number>): string {
  const locale = getCurrentLocale();
  const localeMessages = messages[locale] || messages.en;

  let translation = getNestedValue(localeMessages as Record<string, unknown>, fullPath);

  // Fallback to English if translation not found
  if (!translation && locale !== 'en') {
    translation = getNestedValue(messages.en as Record<string, unknown>, fullPath);
  }

  if (!translation) {
    console.warn(`[i18n] Missing translation: ${fullPath}`);
    return fullPath.split('.').pop() || fullPath;
  }

  // Handle parameter interpolation
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      translation = translation!.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }

  return translation;
}
