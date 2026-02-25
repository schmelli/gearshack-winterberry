# I18N Infrastructure Documentation

## Overview

This project uses **next-intl** for internationalization with the Next.js 16+ App Router.

## Supported Locales

- `en` (English) - Default locale
- `de` (German)

## Directory Structure

```
messages/
├── en.json              # Main English translations
├── de.json              # Main German translations
├── en/
│   ├── bulletin.json    # Bulletin board translations
│   ├── community.json   # Community feature translations
│   └── vip.json         # VIP feature translations
└── de/
    ├── bulletin.json    # Bulletin board translations
    ├── community.json   # Community feature translations
    └── vip.json         # VIP feature translations

i18n/
├── config.ts            # Locale configuration (locales, defaultLocale)
├── navigation.ts        # Locale-aware navigation exports (Link, redirect, usePathname, useRouter)
└── request.ts           # Server-side message loading configuration
```

## Translation Hook Usage

### In Client Components

```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('Namespace');
  return <div>{t('key')}</div>;
}
```

### In Server Components

```tsx
import { getTranslations } from 'next-intl/server';

export default async function MyPage() {
  const t = await getTranslations('Namespace');
  return <div>{t('key')}</div>;
}
```

## Navigation

Use locale-aware navigation from `@/i18n/navigation`:

```tsx
import { Link, usePathname, useRouter, redirect } from '@/i18n/navigation';

// Instead of:
// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
```

## Key Namespaces

| Namespace | Purpose |
|-----------|---------|
| Navigation | Header, footer navigation |
| Common | Shared UI strings (save, cancel, loading) |
| Auth | Authentication forms |
| Inventory | Gear inventory features |
| GearEditor | Gear item editor form |
| GearDetail | Gear detail view |
| Loadouts | Loadout management |
| LoadoutCreation | Loadout creation wizard |
| Landing | Landing page |
| Footer | Footer content |
| Hero | Hero section |
| SmartSearch | Product search feature |
| Social | Social features (friends, following) |
| Shakedowns | Community shakedowns |
| Merchant | Merchant portal |
| MerchantLoadouts | Merchant loadout features |
| SharedLoadout | Public loadout sharing |
| Profile | User profile |
| aiAssistant | AI assistant chat |
| vip | VIP features (namespaced file) |
| bulletin | Bulletin board (namespaced file) |
| Community | Community hub (namespaced file) |

## Variable Interpolation

```tsx
// Simple variable
t('greeting', { name: 'John' })
// In JSON: "greeting": "Hello, {name}!"

// Pluralization (ICU format)
t('itemCount', { count: 5 })
// In JSON: "itemCount": "{count, plural, one {# item} other {# items}}"
```

## Adding New Translations

1. Add keys to both `messages/en.json` and `messages/de.json`
2. For namespaced features, add to `messages/en/[namespace].json` and `messages/de/[namespace].json`
3. Follow existing key naming patterns: `Namespace.section.key`
4. Use meaningful, descriptive key names
5. Always add both English AND German translations

## Key Naming Conventions

- Use PascalCase for top-level namespaces: `Navigation`, `GearEditor`
- Use camelCase for nested keys: `searchPlaceholder`, `noItemsFound`
- Group related keys under common parent: `errors.loginFailed`, `errors.registerFailed`
- Use descriptive names: `confirmDeleteTitle` not `deleteTitle1`
