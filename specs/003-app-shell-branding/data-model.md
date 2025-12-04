# Data Model: App Shell & Branding

**Feature**: 003-app-shell-branding
**Date**: 2025-12-04

## Overview

This feature is primarily UI/layout focused with minimal data modeling needs. The types defined here support navigation configuration and component props.

## New Types (for this feature)

### NavItem

```typescript
/**
 * Represents a navigation menu entry.
 * Used in both desktop nav and mobile menu.
 */
interface NavItem {
  /** Display label for the navigation link */
  label: string;

  /** Target URL path */
  href: string;

  /** Whether the link is currently enabled */
  enabled: boolean;

  /** Optional icon component (lucide-react) */
  icon?: React.ComponentType<{ className?: string }>;
}
```

**Usage**:
- Desktop navigation links in header
- Mobile navigation links in Sheet

---

### UserMenuItem

```typescript
/**
 * Represents an action item in the user dropdown menu.
 */
interface UserMenuItem {
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
```

**Usage**:
- User menu dropdown items (Profile, Settings, Sign out)

---

### SiteHeaderProps

```typescript
/**
 * Props for the SiteHeader component.
 */
interface SiteHeaderProps {
  /** Additional CSS classes */
  className?: string;
}
```

---

### SiteFooterProps

```typescript
/**
 * Props for the SiteFooter component.
 */
interface SiteFooterProps {
  /** Additional CSS classes */
  className?: string;
}
```

---

### MobileNavProps

```typescript
/**
 * Props for the MobileNav component.
 */
interface MobileNavProps {
  /** Navigation items to display */
  items: NavItem[];

  /** Callback when navigation occurs */
  onNavigate?: () => void;
}
```

---

### UserMenuProps

```typescript
/**
 * Props for the UserMenu component.
 */
interface UserMenuProps {
  /** User display name */
  userName?: string;

  /** User avatar URL */
  avatarUrl?: string;

  /** Menu items to display */
  items: UserMenuItem[];
}
```

---

## Navigation Configuration Constants

```typescript
/**
 * Main navigation items for the application.
 */
const MAIN_NAV_ITEMS: NavItem[] = [
  { label: 'Inventory', href: '/inventory', enabled: true },
  { label: 'Loadouts', href: '/loadouts', enabled: false },
  { label: 'Community', href: '/community', enabled: false },
];

/**
 * User menu dropdown items.
 */
const USER_MENU_ITEMS: UserMenuItem[] = [
  { label: 'Profile', href: '/profile' },
  { label: 'Settings', href: '/settings' },
  { label: 'Sign out', onClick: () => {}, destructive: true },
];

/**
 * Footer legal links.
 */
const FOOTER_LEGAL_LINKS = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

/**
 * Footer social media links.
 */
const FOOTER_SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
  { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
];
```

---

## File Organization

| Type | File Path | Notes |
|------|-----------|-------|
| NavItem | types/navigation.ts | New file |
| UserMenuItem | types/navigation.ts | New file |
| SiteHeaderProps | components/layout/SiteHeader.tsx | Co-located |
| SiteFooterProps | components/layout/SiteFooter.tsx | Co-located |
| MobileNavProps | components/layout/MobileNav.tsx | Co-located |
| UserMenuProps | components/layout/UserMenu.tsx | Co-located |
| MAIN_NAV_ITEMS | lib/constants/navigation.ts | New file |
| USER_MENU_ITEMS | lib/constants/navigation.ts | New file |
| FOOTER_LEGAL_LINKS | lib/constants/navigation.ts | New file |
| FOOTER_SOCIAL_LINKS | lib/constants/navigation.ts | New file |

---

## Validation

No Zod schemas needed for this feature:
- NavItem and UserMenuItem are static configuration, not user input
- Props are passed internally between components
- No external data sources or API responses to validate
