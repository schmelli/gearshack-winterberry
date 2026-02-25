/**
 * TypeScript Declarations for i18n Messages
 *
 * Feature: 027-i18n-next-intl
 * DR-008: Type-safe message keys via global declarations
 *
 * Provides compile-time validation and IDE autocompletion for translation keys.
 */

import en from './messages/en.json';

type Messages = typeof en;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}

export {};
