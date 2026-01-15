/**
 * Navigation Constants
 *
 * Feature: 027-i18n-next-intl
 * T024: Updated navigation items with translation keys
 *
 * Community Section Restructure
 * - Community now uses dropdown menu instead of separate page tabs
 * - Sub-navigation items for Dashboard, Shakedowns, VIP Loadouts, Marketplace, Wiki
 */

import { Instagram, Twitter, LayoutDashboard, Scale, Star, ShoppingBag, BookOpen, Backpack, Compass, Users } from 'lucide-react';
import type { NavItem, NavItemWithChildren, UserMenuItem } from '@/types/navigation';

/**
 * Community sub-navigation items for the dropdown menu.
 * Replaces the previous tab-based navigation.
 */
export const COMMUNITY_SUB_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', translationKey: 'communityDashboard', href: '/community', enabled: true, icon: LayoutDashboard },
  { label: 'Shakedowns', translationKey: 'shakedowns', href: '/community/shakedowns', enabled: true, icon: Scale },
  { label: 'VIP Loadouts', translationKey: 'vipLoadouts', href: '/community/merchant-loadouts', enabled: true, icon: Star },
  { label: 'Marketplace', translationKey: 'marketplace', href: '/community/marketplace', enabled: true, icon: ShoppingBag },
  { label: 'Wiki', translationKey: 'wiki', href: '/community/wiki', enabled: true, icon: BookOpen },
];

/**
 * Main navigation items for the application.
 * Uses translationKey for i18n lookup in Navigation namespace.
 * Community now has children for dropdown menu.
 */
export const MAIN_NAV_ITEMS: NavItemWithChildren[] = [
  { label: 'Inventory', translationKey: 'inventory', href: '/inventory', enabled: true, icon: Backpack },
  { label: 'Loadouts', translationKey: 'loadouts', href: '/loadouts', enabled: true, icon: Compass },
  { label: 'Community', translationKey: 'community', href: '/community', enabled: true, icon: Users, children: COMMUNITY_SUB_NAV_ITEMS },
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
