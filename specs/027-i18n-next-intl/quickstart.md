# Quickstart: Internationalization with next-intl

**Feature**: 027-i18n-next-intl
**Date**: 2025-12-07
**Estimated Changes**: ~200 lines across 8+ files

## Pre-Implementation Checklist

- [x] Read spec.md - 4 user stories (English default, German switch, URL routing, provider integration)
- [x] Read research.md - 8 decision records
- [x] Understand existing layout.tsx provider hierarchy
- [x] Identify all routes to migrate

## Implementation Steps

### Step 1: Install Dependency

```bash
npm install next-intl
```

### Step 2: Create i18n Configuration

**File**: `i18n/config.ts` (NEW)

```typescript
export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];
```

**File**: `i18n/request.ts` (NEW)

```typescript
import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**File**: `i18n/navigation.ts` (NEW)

```typescript
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales, defaultLocale });
```

### Step 3: Create Middleware

**File**: `middleware.ts` (NEW at repository root)

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  matcher: ['/', '/(de|en)/:path*'],
};
```

### Step 4: Create Translation Files

**File**: `messages/en.json` (NEW)

```json
{
  "Navigation": {
    "inventory": "Inventory",
    "loadouts": "Loadouts",
    "community": "Community",
    "login": "Login",
    "signOut": "Sign out",
    "profile": "Profile",
    "settings": "Settings"
  },
  "Hero": {
    "title": "Master Your Loadout",
    "subtitle": "Organize your gear, plan your adventures, conquer the outdoors."
  },
  "Common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  }
}
```

**File**: `messages/de.json` (NEW)

```json
{
  "Navigation": {
    "inventory": "Inventar",
    "loadouts": "Ladungen",
    "community": "Community",
    "login": "Anmelden",
    "signOut": "Abmelden",
    "profile": "Profil",
    "settings": "Einstellungen"
  },
  "Hero": {
    "title": "Meistere Deine Ausrüstung",
    "subtitle": "Organisiere deine Ausrüstung, plane deine Abenteuer, erobere die Natur."
  },
  "Common": {
    "loading": "Laden...",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten"
  }
}
```

### Step 5: Create Type Declarations

**File**: `global.d.ts` (NEW at repository root)

```typescript
import en from './messages/en.json';

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
```

### Step 6: Update next.config.ts

**File**: `next.config.ts` (MODIFY)

Add the next-intl plugin:

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  // existing config...
};

export default withNextIntl(nextConfig);
```

### Step 7: The Great Migration

**Move files to `app/[locale]/` directory:**

```bash
# Create the locale directory
mkdir -p app/[locale]

# Move pages (keeping globals.css and favicon at app/ level)
mv app/page.tsx app/[locale]/
mv app/inventory app/[locale]/
mv app/loadouts app/[locale]/
mv app/login app/[locale]/
mv app/settings app/[locale]/

# Move and update layout
mv app/layout.tsx app/[locale]/layout.tsx
```

### Step 8: Update Root Layout

**File**: `app/[locale]/layout.tsx` (MODIFY after move)

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono, Rock_Salt } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Shell } from "@/components/layout/Shell";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales } from '@/i18n/config';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rockSalt = Rock_Salt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-rock-salt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gearshack",
  description: "Gear management for the obsessed.",
};

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rockSalt.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            <AuthProvider>
              <SyncProvider />
              <Shell>{children}</Shell>
              <Toaster richColors position="bottom-right" />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Step 9: Create Language Switcher Component

**File**: `components/layout/LanguageSwitcher.tsx` (NEW)

```typescript
'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = () => {
    const newLocale: Locale = locale === 'en' ? 'de' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className="text-white hover:bg-white/10 hover:text-white font-medium"
    >
      {locale === 'en' ? 'DE' : 'EN'}
    </Button>
  );
}
```

### Step 10: Update SiteHeader

**File**: `components/layout/SiteHeader.tsx` (MODIFY)

Add imports:
```typescript
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
```

Replace `next/link` import with `@/i18n/navigation` Link.

Add translations hook:
```typescript
const t = useTranslations('Navigation');
```

Update navigation to use translation keys:
```typescript
// In MAIN_NAV_ITEMS map, use translation:
{t(item.key)} // where key is 'inventory', 'loadouts', 'community'
```

Add LanguageSwitcher to header (before UserMenu):
```typescript
<LanguageSwitcher />
```

## Validation

1. **Lint**: `npm run lint` - must pass
2. **Build**: `npm run build` - must succeed
3. **Manual Test - Default Locale**:
   - Navigate to `/` → should redirect to `/en/`
   - Verify header shows "Inventory", "Loadouts", "Community"
4. **Manual Test - Language Switch**:
   - Click "DE" button → URL changes to `/de/...`
   - Verify header shows "Inventar", "Ladungen", "Community"
5. **Manual Test - Direct URL**:
   - Navigate to `/de/inventory` directly
   - Verify page loads in German
6. **Manual Test - Providers**:
   - Log in → verify auth works
   - Create/edit gear → verify sync works

## Success Criteria

- [ ] SC-001: Users can switch between English and German with a single click
- [ ] SC-002: All navigation text displays correctly in both languages
- [ ] SC-003: Page URLs correctly reflect the active locale
- [ ] SC-004: Existing features (auth, data sync) continue to work
- [ ] SC-005: Application builds with no TypeScript errors
- [ ] SC-006: Language preference persists via URL
