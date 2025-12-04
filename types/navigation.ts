/**
 * Navigation types for the App Shell components.
 */

/**
 * Represents a navigation menu entry.
 * Used in both desktop nav and mobile menu.
 */
export interface NavItem {
  /** Display label for the navigation link */
  label: string;

  /** Target URL path */
  href: string;

  /** Whether the link is currently enabled */
  enabled: boolean;

  /** Optional icon component (lucide-react) */
  icon?: React.ComponentType<{ className?: string }>;
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
