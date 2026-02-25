/**
 * Navigation types for the App Shell components.
 *
 * Community Section Restructure
 * - Added NavItemWithChildren for dropdown menus
 */

/**
 * Represents a navigation menu entry.
 * Used in both desktop nav and mobile menu.
 *
 * Feature: 027-i18n-next-intl
 * Added translationKey for i18n support.
 */
export interface NavItem {
  /** Display label for the navigation link (fallback if no translation) */
  label: string;

  /** Translation key for i18n lookup (e.g., 'inventory', 'loadouts') */
  translationKey: string;

  /** Target URL path */
  href: string;

  /** Whether the link is currently enabled */
  enabled: boolean;

  /** Optional icon component (lucide-react) */
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Represents a navigation item that can have child items for dropdowns.
 * Extends NavItem with optional children array for sub-navigation.
 */
export interface NavItemWithChildren extends NavItem {
  /** Optional child navigation items for dropdown menus */
  children?: NavItem[];
}

/**
 * Represents an action item in the user dropdown menu.
 */
export interface UserMenuItem {
  /** Display label for the menu item */
  label: string;

  /** Optional icon component (lucide-react) */
  icon?: React.ComponentType<{ className?: string }>;

  /** Click handler for the action */
  onClick?: () => void;

  /** Optional href for navigation items */
  href?: string;

  /** Whether this is a destructive action (styled differently) */
  destructive?: boolean;
}
