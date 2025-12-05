# Data Model: Nature Vibe Polish

**Feature**: 004-nature-vibe-polish
**Date**: 2025-12-04

## Overview

This feature is primarily CSS/styling focused with minimal data modeling needs. The only data involved is the user's theme preference, which is handled by next-themes and stored in localStorage.

## Theme Preference

### Storage Location

Theme preference is stored in `localStorage` under the key `theme` (next-themes default).

### Possible Values

```typescript
type Theme = 'light' | 'dark';
```

### Default Behavior

- Default theme: `'light'`
- System preference: Disabled (manual toggle takes precedence per spec)
- Persistence: Automatic via next-themes

## CSS Variables (Design Tokens)

### Light Mode Color Palette

```css
:root {
  /* Nature Theme - Light Mode */
  --radius: 0.75rem;

  /* Forest Green Primary */
  --primary: oklch(0.35 0.08 155);
  --primary-foreground: oklch(0.98 0 0);

  /* Terracotta Accent */
  --accent: oklch(0.65 0.18 70);
  --accent-foreground: oklch(0.15 0 0);

  /* Stone Background */
  --background: oklch(0.985 0.002 90);
  --foreground: oklch(0.20 0.02 155);

  /* Card Surface */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.20 0.02 155);

  /* Borders */
  --border: oklch(0.88 0.01 90);

  /* Muted (secondary text, placeholders) */
  --muted: oklch(0.96 0.005 90);
  --muted-foreground: oklch(0.50 0.02 155);
}
```

### Dark Mode Color Palette

```css
.dark {
  /* Nature Theme - Dark Mode (Forest Night) */

  /* Lighter Forest Green for visibility */
  --primary: oklch(0.65 0.12 155);
  --primary-foreground: oklch(0.15 0.02 155);

  /* Slightly brighter Terracotta */
  --accent: oklch(0.70 0.16 70);
  --accent-foreground: oklch(0.15 0 0);

  /* Deep Forest Background */
  --background: oklch(0.18 0.02 155);
  --foreground: oklch(0.92 0.01 90);

  /* Dark Card Surface */
  --card: oklch(0.22 0.015 155);
  --card-foreground: oklch(0.92 0.01 90);

  /* Dark Borders */
  --border: oklch(0.35 0.02 155);

  /* Dark Muted */
  --muted: oklch(0.28 0.015 155);
  --muted-foreground: oklch(0.65 0.02 90);
}
```

## Component Props (Existing Types)

No new TypeScript types needed. Existing component props remain unchanged:

| Component | Props Interface | Changes |
|-----------|-----------------|---------|
| SiteHeader | SiteHeaderProps | None (styling only) |
| GearCard | GearCardProps | None (styling only) |
| StatusBadge | StatusBadgeProps | None (color updates via CSS) |

## Status Badge Color Mapping

Updated color classes for theme consistency:

```typescript
const STATUS_COLORS: Record<GearStatus, string> = {
  active: 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary',
  wishlist: 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent',
  sold: 'bg-muted text-muted-foreground',
};
```

## File Organization

| Entity | File Path | Notes |
|--------|-----------|-------|
| Theme Provider | components/theme/ThemeProvider.tsx | New file - wraps next-themes |
| Theme Hook | hooks/useThemePreference.ts | New file - wraps useTheme |
| CSS Variables | app/globals.css | Update existing file |
| Settings Page | app/settings/page.tsx | New file |

## Validation

No Zod schemas needed for this feature:
- Theme value is constrained by next-themes internally
- CSS variables are static configuration
- No user input beyond toggle interaction
