# Research: Internationalization with next-intl

**Feature**: 027-i18n-next-intl
**Date**: 2025-12-07

## Decision Records

### DR-001: i18n Library Selection

**Decision**: Use `next-intl` for internationalization

**Rationale**:
- Native App Router support with Server Components
- Type-safe message keys with TypeScript
- Built-in locale detection and routing
- Well-documented, actively maintained
- Lightweight (~15kb gzipped)

**Alternatives Considered**:
- `react-i18next`: Requires more setup for App Router, larger bundle
- `next-translate`: Less mature App Router support
- Custom solution: Too much maintenance overhead

### DR-002: Locale Configuration Structure

**Decision**: Centralize i18n configuration in `i18n/` directory at repository root

**Rationale**:
- Clear separation from app routes
- Easy to locate and modify
- Follows next-intl recommended structure
- Keeps `lib/` focused on utilities

**Structure**:
```
i18n/
├── config.ts      # Exported locales, defaultLocale constants
├── request.ts     # getRequestConfig for server components
└── navigation.ts  # createLocalizedPathnamesNavigation exports
```

### DR-003: Translation File Organization

**Decision**: Use single JSON file per locale in `messages/` directory with nested namespaces

**Rationale**:
- Simple structure for current scope (navigation + hero)
- Easy to extend as more translations needed
- Type generation works with single file approach
- No runtime complexity of splitting bundles

**Structure**:
```json
{
  "Navigation": {
    "inventory": "Inventory",
    "loadouts": "Loadouts",
    "community": "Community",
    "login": "Login"
  },
  "Hero": {
    "title": "Master Your Loadout",
    "subtitle": "..."
  }
}
```

### DR-004: Layout Migration Strategy

**Decision**: Create new `app/[locale]/layout.tsx` that wraps existing providers with `NextIntlClientProvider`

**Rationale**:
- Preserves existing provider hierarchy (Theme → Auth → Sync)
- Minimal changes to existing components
- NextIntlClientProvider can wrap or be wrapped by other providers
- Font definitions stay in locale layout for dynamic `lang` attribute

**Provider Order**:
```tsx
<html lang={locale}>
  <body>
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider>
        <AuthProvider>
          <SyncProvider />
          <Shell>{children}</Shell>
        </AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  </body>
</html>
```

### DR-005: Language Switcher Implementation

**Decision**: Simple text toggle button in header (EN | DE)

**Rationale**:
- Only 2 locales, dropdown unnecessary
- Visible and accessible
- Follows existing header design patterns
- Uses `usePathname` + `useRouter` for locale-preserving navigation

**UI Pattern**:
```tsx
// Toggle between locales while preserving current path
<Button variant="ghost" size="sm">
  {locale === 'en' ? 'DE' : 'EN'}
</Button>
```

### DR-006: Navigation Link Handling

**Decision**: Use next-intl's `Link` component which automatically handles locale prefixing

**Rationale**:
- No manual locale prepending needed
- Automatically uses current locale context
- Works with existing navigation constants
- Handles both relative and absolute paths

**Import Pattern**:
```tsx
import { Link } from '@/i18n/navigation';
// Instead of: import Link from 'next/link';
```

### DR-007: Middleware Configuration

**Decision**: Use next-intl's `createMiddleware` with locale detection and default locale redirect

**Rationale**:
- Handles browser language detection (Accept-Language header)
- Redirects root `/` to `/en/` (default locale)
- Redirects unknown locales to default
- Configurable locale prefix behavior

**Matcher Configuration**:
```ts
export const config = {
  matcher: ['/', '/(de|en)/:path*']
};
```

### DR-008: Type Safety for Translation Keys

**Decision**: Create `global.d.ts` extending next-intl's types with message structure

**Rationale**:
- Compile-time validation of translation keys
- IDE autocompletion for message namespaces and keys
- Catches typos and missing translations early
- Standard next-intl pattern

**Declaration Pattern**:
```ts
type Messages = typeof import('./messages/en.json');
declare interface IntlMessages extends Messages {}
```

## Implementation Notes

### Files to Create (New)

1. `i18n/config.ts` - Locale constants
2. `i18n/request.ts` - Server request config
3. `i18n/navigation.ts` - Locale-aware navigation
4. `messages/en.json` - English translations
5. `messages/de.json` - German translations
6. `middleware.ts` - Locale routing middleware
7. `global.d.ts` - TypeScript declarations
8. `components/layout/LanguageSwitcher.tsx` - Toggle component

### Files to Modify

1. `app/layout.tsx` → Move to `app/[locale]/layout.tsx`
2. `app/page.tsx` → Move to `app/[locale]/page.tsx`
3. All route folders → Move under `app/[locale]/`
4. `components/layout/SiteHeader.tsx` - Add LanguageSwitcher, use translations
5. `lib/constants/navigation.ts` - Update for i18n support

### Files to Keep

1. `app/globals.css` - Stays at `app/` level (not in [locale])
2. `app/favicon.ico` - Stays at `app/` level

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Build breaks after migration | Medium | High | Incremental migration, test after each step |
| Providers break | Low | High | Preserve exact provider order in new layout |
| Links don't preserve locale | Medium | Medium | Use next-intl Link component consistently |
| Type errors with messages | Low | Low | Generate types from en.json source of truth |
