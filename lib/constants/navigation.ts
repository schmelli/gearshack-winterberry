import { Instagram, Twitter } from 'lucide-react';
import type { NavItem, UserMenuItem } from '@/types/navigation';

/**
 * Main navigation items for the application.
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Inventory', href: '/inventory', enabled: true },
  { label: 'Loadouts', href: '/loadouts', enabled: false },
  { label: 'Community', href: '/community', enabled: false },
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
 */
export const FOOTER_LEGAL_LINKS = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const;

/**
 * Footer social media links.
 */
export const FOOTER_SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
  { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
] as const;
