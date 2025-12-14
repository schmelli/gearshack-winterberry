/**
 * Navigation Constants
 *
 * Feature: 027-i18n-next-intl
 * T024: Updated navigation items with translation keys
 */

import { Instagram, Twitter } from 'lucide-react';
import type { NavItem, UserMenuItem } from '@/types/navigation';

/**
 * Main navigation items for the application.
 * Uses translationKey for i18n lookup in Navigation namespace.
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Inventory', translationKey: 'inventory', href: '/inventory', enabled: true },
  { label: 'Loadouts', translationKey: 'loadouts', href: '/loadouts', enabled: true },
  { label: 'Community', translationKey: 'community', href: '/community', enabled: false },
];

/**
 * User menu dropdown items.
 */
export const USER_MENU_ITEMS: UserMenuItem[] = [
  { label: 'Profile', href: '/profile' },
  { label: 'Settings', href: '/settings' },
  { label: 'Sign out', onClick: () => {}, destructive: true },
];

/**
 * Footer legal links.
 * Note: These pages are not yet implemented - using '#' as placeholder
 * to prevent 404 errors during development.
 */
export const FOOTER_LEGAL_LINKS = [
  { label: 'Impressum', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Terms', href: '#' },
] as const;

/**
 * Footer social media links.
 */
export const FOOTER_SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
  { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
] as const;
