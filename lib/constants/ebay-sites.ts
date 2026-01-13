/**
 * eBay Site Configuration
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Map locales to eBay country sites for localized search
 */

import type { EbaySiteConfig, EbaySiteMap } from '@/types/ebay';

// =============================================================================
// eBay Site Configurations
// =============================================================================

/**
 * eBay site configurations mapped by locale code
 * Used for localized search results based on user's profile locale
 */
export const EBAY_SITES: EbaySiteMap = {
  // German-speaking
  de: {
    site: 'ebay.de',
    currency: 'EUR',
    country: 'Germany',
    serpApiDomain: 'EBAY_DE',
  },
  'de-AT': {
    site: 'ebay.at',
    currency: 'EUR',
    country: 'Austria',
    serpApiDomain: 'EBAY_AT',
  },
  'de-CH': {
    site: 'ebay.ch',
    currency: 'CHF',
    country: 'Switzerland',
    serpApiDomain: 'EBAY_CH',
  },

  // English-speaking
  en: {
    site: 'ebay.com',
    currency: 'USD',
    country: 'United States',
    serpApiDomain: 'EBAY_US',
  },
  'en-US': {
    site: 'ebay.com',
    currency: 'USD',
    country: 'United States',
    serpApiDomain: 'EBAY_US',
  },
  'en-GB': {
    site: 'ebay.co.uk',
    currency: 'GBP',
    country: 'United Kingdom',
    serpApiDomain: 'EBAY_GB',
  },
  'en-AU': {
    site: 'ebay.com.au',
    currency: 'AUD',
    country: 'Australia',
    serpApiDomain: 'EBAY_AU',
  },
  'en-CA': {
    site: 'ebay.ca',
    currency: 'CAD',
    country: 'Canada',
    serpApiDomain: 'EBAY_CA',
  },

  // Romance languages
  fr: {
    site: 'ebay.fr',
    currency: 'EUR',
    country: 'France',
    serpApiDomain: 'EBAY_FR',
  },
  it: {
    site: 'ebay.it',
    currency: 'EUR',
    country: 'Italy',
    serpApiDomain: 'EBAY_IT',
  },
  es: {
    site: 'ebay.es',
    currency: 'EUR',
    country: 'Spain',
    serpApiDomain: 'EBAY_ES',
  },

  // Other European
  nl: {
    site: 'ebay.nl',
    currency: 'EUR',
    country: 'Netherlands',
    serpApiDomain: 'EBAY_NL',
  },
  pl: {
    site: 'ebay.pl',
    currency: 'PLN',
    country: 'Poland',
    serpApiDomain: 'EBAY_PL',
  },
  be: {
    site: 'ebay.be',
    currency: 'EUR',
    country: 'Belgium',
    serpApiDomain: 'EBAY_BE',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get eBay site configuration for a locale
 * Falls back to US eBay if locale not found
 */
export function getEbaySiteForLocale(locale: string): EbaySiteConfig {
  // Try exact match first
  if (EBAY_SITES[locale]) {
    return EBAY_SITES[locale];
  }

  // Try language-only match (e.g., 'de' for 'de-DE')
  const language = locale.split('-')[0];
  if (EBAY_SITES[language]) {
    return EBAY_SITES[language];
  }

  // Default to US eBay
  return EBAY_SITES['en'];
}

/**
 * Get all available eBay site codes
 */
export function getAvailableEbaySites(): string[] {
  return Object.keys(EBAY_SITES);
}

/**
 * Check if a locale has a dedicated eBay site
 */
export function hasEbaySite(locale: string): boolean {
  const language = locale.split('-')[0];
  return Boolean(EBAY_SITES[locale] || EBAY_SITES[language]);
}
