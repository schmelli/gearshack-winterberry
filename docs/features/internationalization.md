# Internationalization (i18n)

**Status**: ✅ Active
**Feature**: 027-i18n-next-intl
**Library**: `next-intl` 3.x
**Locales**: English (`en`), German (`de`)
**Default Locale**: English (`en`)

## Overview

Gearshack ist vollständig internationalisiert und unterstützt **Englisch** und **Deutsch**. Das i18n-System basiert auf `next-intl`, einer modernen Internationalisierungs-Bibliothek für Next.js mit Server Components Support. ALLE user-sichtbaren Texte müssen übersetzt sein - hardcodierte Strings sind nicht erlaubt.

### Core Features
- 2 Locales (EN, DE) mit Erweiterbarkeit für weitere
- URL-basierte Locale Detection (`/en/inventory`, `/de/inventar`)
- Server Components + Client Components Support
- Type-safe Translations (TypeScript auto-completion)
- Namespaced Messages für große Features (VIP, Bulletin, Community)
- ICU Message Format (Plurals, Variables, Rich Text)
- Automated i18n Audit (Claude Code Hook)
- Locale-aware Navigation (Link, redirect, useRouter)
- Fallback zu Default Locale bei fehlenden Keys

---

## Core Concepts

### Locale Structure

**Supported Locales** (`i18n/config.ts`):
```typescript
export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];  // 'en' | 'de'
```

**URL Pattern**:
```
/[locale]/[...route]
```

**Examples**:
- `/en/inventory` → English inventory page
- `/de/inventar` → German inventory page (same page, translated slug)
- `/en/loadouts/123` → English loadout detail
- `/de/packlisten/123` → German loadout detail

**Root URL Redirect**:
- `/` → `/en` (default locale)
- Detected via Accept-Language header (future)

### Message Files

**Location**: `messages/[locale].json`

**Structure**:
```json
{
  "Navigation": {
    "inventory": "Inventory",
    "loadouts": "Loadouts",
    "addNewItem": "Add new item"
  },
  "GearEditor": {
    "title": "Edit Gear Item",
    "save": "Save",
    "cancel": "Cancel"
  },
  "Loadouts": {
    "create": "Create loadout",
    "empty": "No loadouts yet"
  }
}
```

**Namespaces**: Top-level keys (z.B. `Navigation`, `GearEditor`) sind Namespaces für logische Gruppierung.

**Nested Keys**: Unlimited nesting via dot notation:
```json
{
  "Auth": {
    "errors": {
      "invalidEmail": "Please enter a valid email address",
      "passwordTooShort": "Password must be at least 6 characters"
    }
  }
}
```

### Namespaced Message Files (Feature-specific)

**Large Features** bekommen eigene Message Files:

**Location**: `messages/[locale]/[feature].json`

**Examples**:
- `messages/en/vip.json` - VIP Loadouts Feature
- `messages/de/bulletin.json` - Community Bulletin Board
- `messages/en/community.json` - Community Features

**Merged** automatisch in `i18n/request.ts`:
```typescript
return {
  locale,
  messages: {
    ...mainMessages,             // messages/en.json
    vip: vipMessages,            // messages/en/vip.json
    bulletin: bulletinMessages,  // messages/en/bulletin.json
    Community: communityMessages,// messages/en/community.json
  },
};
```

**Usage**:
```tsx
const t = useTranslations('vip.loadouts');
<h2>{t('title')}</h2>  {/* From messages/en/vip.json */}
```

---

## Usage in Components

### Client Components

**Import**:
```tsx
'use client';
import { useTranslations } from 'next-intl';
```

**Basic Usage**:
```tsx
function InventoryPage() {
  const t = useTranslations('Inventory');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('addItem')}</button>
    </div>
  );
}
```

**Multiple Namespaces**:
```tsx
function GearCard() {
  const tGear = useTranslations('GearEditor');
  const tCommon = useTranslations('Common');

  return (
    <Card>
      <h2>{tGear('title')}</h2>
      <Button>{tCommon('save')}</Button>
    </Card>
  );
}
```

### Server Components

**Import**:
```tsx
import { getTranslations } from 'next-intl/server';
```

**Async Usage**:
```tsx
async function InventoryPage() {
  const t = await getTranslations('Inventory');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

**Metadata** (SEO):
```tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('Inventory.meta');

  return {
    title: t('title'),
    description: t('description'),
  };
}
```

---

## ICU Message Format

### Variables

**JSON**:
```json
{
  "welcome": "Welcome back, {name}!"
}
```

**Usage**:
```tsx
const t = useTranslations('Auth');
<p>{t('welcome', { name: user.displayName })}</p>
// Output: "Welcome back, John!"
```

### Plurals

**JSON**:
```json
{
  "itemCount": "{count, plural, =0 {No items} =1 {1 item} other {# items}}"
}
```

**Usage**:
```tsx
<p>{t('itemCount', { count: items.length })}</p>
// Output: "No items" | "1 item" | "5 items"
```

**German** (different plural rules):
```json
{
  "itemCount": "{count, plural, =0 {Keine Artikel} =1 {1 Artikel} other {# Artikel}}"
}
```

### Select (Conditional)

**JSON**:
```json
{
  "status": "{status, select, active {Active} archived {Archived} other {Unknown}}"
}
```

**Usage**:
```tsx
<Badge>{t('status', { status: item.status })}</Badge>
```

### Rich Text (HTML/React)

**JSON**:
```json
{
  "terms": "I agree to the <link>Terms of Service</link>"
}
```

**Usage**:
```tsx
<p>{t.rich('terms', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>
})}</p>
// Output: I agree to the <a href="/terms">Terms of Service</a>
```

**Complex Example**:
```json
{
  "priceRange": "From <b>{min}</b> to <b>{max}</b> USD"
}
```

```tsx
<p>{t.rich('priceRange', {
  min: 50,
  max: 200,
  b: (chunks) => <strong className="font-bold">{chunks}</strong>
})}</p>
```

---

## Locale-aware Navigation

### Problem

**Native Next.js**:
```tsx
import Link from 'next/link';
<Link href="/inventory">Inventory</Link>
```

→ Navigiert zu `/inventory` (kein Locale Prefix)
→ App bricht oder redirected zu `/en/inventory`

### Solution: next-intl Navigation

**Import** from `@/i18n/navigation` (nicht `next/link`!):

```tsx
import { Link } from '@/i18n/navigation';
<Link href="/inventory">Inventory</Link>
```

→ Automatisch prefixed mit aktuellem Locale: `/en/inventory` oder `/de/inventar`

### Navigation Components

**Link** (locale-aware):
```tsx
import { Link } from '@/i18n/navigation';

<Link href="/inventory">
  Go to inventory
</Link>
// In EN: /en/inventory
// In DE: /de/inventar
```

**useRouter** (programmatic navigation):
```tsx
import { useRouter } from '@/i18n/navigation';

function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/loadouts');  // Auto-prefixed
  };

  return <button onClick={handleClick}>Go</button>;
}
```

**redirect** (server-side):
```tsx
import { redirect } from '@/i18n/navigation';

async function MyServerAction() {
  // Do something...
  redirect('/inventory');  // Auto-prefixed
}
```

**usePathname** (current path without locale):
```tsx
import { usePathname } from '@/i18n/navigation';

function MyComponent() {
  const pathname = usePathname();
  // Returns "/inventory" (nicht "/en/inventory")
  // Useful für active link highlighting
}
```

---

## Localized Routes (Translated Slugs)

### Concept

**Problem**: Englische URLs in deutscher App wirken unprofessionell.

**Solution**: Translate URL slugs.

**Example**:
- EN: `/en/inventory` → "Inventory" page
- DE: `/de/inventar` → "Inventar" page (same page!)

### Implementation

**Next.js App Router** mit `[locale]` dynamic segment:

**Structure**:
```
app/
  [locale]/
    inventory/
      page.tsx        # EN: /en/inventory
    inventar/
      page.tsx        # DE: /de/inventar (links to inventory data)
    loadouts/
      page.tsx        # EN: /en/loadouts
    packlisten/
      page.tsx        # DE: /de/packlisten
```

**Note**: DE pages sind oft **symlinks** oder **re-exports** der EN pages:

```tsx
// app/[locale]/inventar/page.tsx
export { default } from '../inventory/page';
export { generateMetadata } from '../inventory/page';
```

→ Same component, different URL

### Route Mapping (Future)

**Current**: Manual pages für jedes Locale
**Future**: Automatic route translation via `next-intl` config:

```typescript
// i18n/routing.ts (future)
export const routing = {
  pathnames: {
    '/inventory': {
      en: '/inventory',
      de: '/inventar',
    },
    '/loadouts': {
      en: '/loadouts',
      de: '/packlisten',
    },
  },
};
```

→ Eine Page, mehrere URLs

---

## Automated i18n Audit

### Problem

**Hardcoded Strings** sind schwer zu finden:
```tsx
<p>Hello World</p>  // ❌ Should be {t('greeting')}
```

→ Entwickler vergessen oft zu übersetzen
→ Manual review ist zeitaufwendig

### Solution: Claude Code Hook

**Hook**: `.claude/hooks/i18n-audit.sh`

**Trigger**: After editing any `.tsx` or `.ts` file

**Check**:
1. Text content after `>` starting with uppercase (e.g., `<p>Hello</p>`)
2. Hardcoded `title=`, `description=`, `label=` attributes

**Warning**:
```
⚠️ Potential hardcoded strings found in MyComponent.tsx:
- Line 42: "Hello World" (should use t('key'))
- Line 58: title="Settings" (should use t('title'))

Please add translations to messages/en.json and messages/de.json
```

**False Positives** (ignored):
- `<Image alt="..." />` - Alt text oft OK (image filenames)
- JSX expressions (`<p>{variable}</p>`)
- Component names (`<UserMenu />`)

**Configuration** (`.claude/hooks-config.json`):
```json
{
  "i18n-audit": {
    "enabled": true,
    "excludePatterns": [
      "*.test.tsx",
      "__tests__/**"
    ]
  }
}
```

### Workflow

1. Developer edits `GearCard.tsx`:
   ```tsx
   <h3>My Gear</h3>  // ❌ Hardcoded
   ```

2. Save file → Claude Code Hook runs

3. Warning erscheint:
   ```
   ⚠️ Line 15: "My Gear" should use t('title')
   ```

4. Developer fixes:
   ```tsx
   const t = useTranslations('GearCard');
   <h3>{t('title')}</h3>  // ✅
   ```

5. Add to `messages/en.json`:
   ```json
   { "GearCard": { "title": "My Gear" } }
   ```

6. Add to `messages/de.json`:
   ```json
   { "GearCard": { "title": "Meine Ausrüstung" } }
   ```

---

## Translation Workflow

### Adding New Translations

**Step 1: Identify Text**

Find all user-visible strings in your component:
```tsx
// Before
function GearEditor() {
  return (
    <div>
      <h1>Edit Gear Item</h1>
      <p>Update the details below</p>
      <button>Save changes</button>
      <button>Cancel</button>
    </div>
  );
}
```

**Step 2: Add to EN JSON**

`messages/en.json`:
```json
{
  "GearEditor": {
    "title": "Edit Gear Item",
    "description": "Update the details below",
    "save": "Save changes",
    "cancel": "Cancel"
  }
}
```

**Step 3: Add to DE JSON**

`messages/de.json`:
```json
{
  "GearEditor": {
    "title": "Ausrüstung bearbeiten",
    "description": "Aktualisiere die Details unten",
    "save": "Änderungen speichern",
    "cancel": "Abbrechen"
  }
}
```

**Step 4: Use in Component**

```tsx
function GearEditor() {
  const t = useTranslations('GearEditor');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('save')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

### Translation Guidelines

**1. Namespaces**: Match component/feature name
```json
{
  "Navigation": { ... },      // components/layout/Navigation.tsx
  "GearEditor": { ... },      // components/gear/GearEditorForm.tsx
  "Loadouts": { ... }         // app/[locale]/loadouts/page.tsx
}
```

**2. Nested Keys**: Use for logical grouping
```json
{
  "Auth": {
    "login": {
      "title": "Log in",
      "button": "Continue"
    },
    "register": {
      "title": "Create account",
      "button": "Sign up"
    }
  }
}
```

**3. Reusable Keys**: Common actions in shared namespace
```json
{
  "Common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back"
  }
}
```

**4. Context-Specific**: Prefer specific over generic
```json
{
  "GearEditor": {
    "deleteButton": "Delete this item"  // ✅ Clear
  }
}
// Instead of:
{
  "Common": {
    "delete": "Delete"  // ❌ Ambiguous
  }
}
```

**5. German Formality**: Use "du" (informal), not "Sie" (formal)
```json
{
  "Welcome": {
    "en": "Welcome back!",
    "de": "Willkommen zurück!"  // ✅ Informal
    // Not: "Seien Sie willkommen"  // ❌ Too formal
  }
}
```

---

## Configuration Files

### i18n/config.ts

**Defines** supported locales and default:

```typescript
export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];
```

**Usage**:
- Import in `i18n/request.ts`, `i18n/navigation.ts`
- Type-safe locale checking
- Single source of truth

### i18n/navigation.ts

**Creates** locale-aware navigation utilities:

```typescript
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
});
```

**Exports**:
- `Link` - Locale-aware `<Link>`
- `redirect` - Server-side redirect with locale
- `usePathname` - Current path without locale prefix
- `useRouter` - Programmatic navigation with locale

**Import** ALWAYS from `@/i18n/navigation`, NEVER from `next/link` or `next/navigation`:
```tsx
import { Link } from '@/i18n/navigation';  // ✅
import Link from 'next/link';              // ❌
```

### i18n/request.ts

**Provides** locale and messages for Server Components:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en';
  }

  // Load main messages
  const mainMessages = (await import(`../messages/${locale}.json`)).default;

  // Load namespaced messages (graceful fallback if missing)
  let vipMessages = {};
  try {
    vipMessages = (await import(`../messages/${locale}/vip.json`)).default;
  } catch {
    // File not found → empty object
  }

  return {
    locale,
    messages: {
      ...mainMessages,
      vip: vipMessages,
      // ... more namespaces
    },
  };
});
```

**Referenced** in `next.config.ts`:
```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl({ ... });
```

---

## Locale Switching

### Language Switcher Component

**Location**: `components/layout/LanguageSwitcher.tsx`

**Implementation**:
```tsx
'use client';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: 'en' | 'de') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div>
      <button
        onClick={() => switchLocale('en')}
        disabled={locale === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale('de')}
        disabled={locale === 'de'}
      >
        DE
      </button>
    </div>
  );
}
```

**Behavior**:
- User on `/de/inventar` → Clicks "EN" → Redirects to `/en/inventory`
- Preserves current page context
- URL changes to translated slug (if available)

---

## Best Practices

### 1. ALWAYS Use Translations

**❌ Bad**:
```tsx
<h1>Welcome to Gearshack</h1>
<button>Save</button>
```

**✅ Good**:
```tsx
const t = useTranslations('Home');
<h1>{t('welcome')}</h1>
<button>{t('save')}</button>
```

### 2. Namespace Per Feature

**❌ Bad** (one huge namespace):
```json
{
  "App": {
    "welcomeMessage": "...",
    "gearEditorTitle": "...",
    "loadoutCreateButton": "..."
  }
}
```

**✅ Good** (logical grouping):
```json
{
  "Home": { "welcomeMessage": "..." },
  "GearEditor": { "title": "..." },
  "Loadouts": { "createButton": "..." }
}
```

### 3. Extract Reusable Strings

**❌ Bad** (duplication):
```json
{
  "GearEditor": { "save": "Save" },
  "LoadoutEditor": { "save": "Save" },
  "ProfileEditor": { "save": "Save" }
}
```

**✅ Good** (shared namespace):
```json
{
  "Common": { "save": "Save" },
  "GearEditor": { ... },
  "LoadoutEditor": { ... }
}
```

### 4. Use ICU for Dynamic Content

**❌ Bad** (manual concatenation):
```tsx
const message = items.length === 1
  ? '1 item found'
  : `${items.length} items found`;
```

**✅ Good** (ICU plurals):
```json
{
  "itemsFound": "{count, plural, =1 {1 item found} other {# items found}}"
}
```
```tsx
<p>{t('itemsFound', { count: items.length })}</p>
```

### 5. Context-Specific Keys

**❌ Bad** (generic):
```json
{
  "delete": "Delete"
}
```

**✅ Good** (specific):
```json
{
  "deleteItem": "Delete this item",
  "deleteLoadout": "Delete this loadout",
  "deletePermanently": "Permanently delete your account"
}
```

---

## Testing Translations

### Visual Testing

**Manual Checklist**:
1. Switch to DE locale (`/de/...`)
2. Check all pages für:
   - Hardcoded EN text
   - Broken layouts (DE text often longer)
   - Missing translations (shows key instead)
3. Test edge cases:
   - Empty states
   - Error messages
   - Loading states

### Automated Tests

**Check for missing keys**:
```typescript
import enMessages from '@/messages/en.json';
import deMessages from '@/messages/de.json';

describe('Translation completeness', () => {
  it('DE has all EN keys', () => {
    const enKeys = extractKeys(enMessages);
    const deKeys = extractKeys(deMessages);

    const missing = enKeys.filter(key => !deKeys.includes(key));
    expect(missing).toEqual([]);
  });
});

function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.keys(obj).flatMap(key => {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      return extractKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}
```

---

## Troubleshooting

### "Missing translation key" Error

**Symptom**: Key appears as raw string (e.g., `GearEditor.title`).

**Causes**:
1. Key not in JSON file
2. Typo in key name
3. Wrong namespace

**Fix**:
1. Check `messages/en.json` → Key exists?
2. Check namespace: `useTranslations('GearEditor')` matches `GearEditor.title`?
3. Restart dev server (HMR doesn't always catch JSON changes)

### Layout Breaks in German

**Symptom**: Buttons/text overflow, broken UI in DE locale.

**Cause**: German text is ~30% longer than English.

**Fix**:
- Use `text-ellipsis` for truncation
- Increase container widths
- Use responsive breakpoints
- Test with long DE strings early

**Example**:
```tsx
{/* EN: "Save" (4 chars) vs DE: "Speichern" (9 chars) */}
<button className="min-w-[120px]">{t('save')}</button>
```

### Wrong Locale After Navigation

**Symptom**: Navigate to `/de/inventory` → Shows English.

**Cause**: Used `next/link` instead of `@/i18n/navigation`.

**Fix**:
```tsx
import { Link } from '@/i18n/navigation';  // ✅
// NOT: import Link from 'next/link';  // ❌
```

---

## Future Improvements

- [ ] **More Locales**: French (FR), Spanish (ES), Japanese (JA)
- [ ] **Auto-detect Locale** via `Accept-Language` header (middleware)
- [ ] **Translation Management UI** (for non-developers)
- [ ] **Crowdsourced Translations** (community contributions)
- [ ] **Machine Translation** (DeepL API for draft translations)
- [ ] **Translation Memory** (reuse across namespaces)
- [ ] **Context Screenshots** (for translators)
- [ ] **A/B Testing** (test different phrasings)
- [ ] **RTL Support** (Arabic, Hebrew - future)

---

## Related Docs

- [Tech Stack](../architecture/tech-stack.md) - next-intl
- [Development Setup](../guides/development-setup.md) - Running with different locales
- [CLAUDE.md](../../CLAUDE.md) - i18n coding standards

---

**Last Updated**: 2026-02-06
**Status**: Production-Ready
**Locales**: 2 (EN, DE)
**Translation Keys**: ~1,200+ keys across all namespaces
**Coverage**: 100% (no hardcoded strings in production code)
