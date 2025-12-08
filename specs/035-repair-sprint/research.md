# Research: Repair Sprint - Proxy Route & Navigation Fixes

**Feature**: 035-repair-sprint
**Date**: 2025-12-08
**Status**: Complete

## Research Tasks

### 1. Proxy Image Route Status

**Question**: Does `/api/proxy-image` exist and function correctly?

**Finding**: The route exists at `app/api/proxy-image/route.ts` and is fully implemented with:
- URL validation and protocol checking
- SSRF protection (blocks localhost and private IPs)
- Content-type validation (ensures image/* types)
- File size limits (10MB max)
- Timeout handling (30 seconds)
- Proper error responses with descriptive messages

**Decision**: No changes needed to proxy route. Route is complete and production-ready.

**Evidence**:
```typescript
// From app/api/proxy-image/route.ts:55-174
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  // ... validation, SSRF protection, fetch, and response handling
}
```

---

### 2. Navigation Link Pattern

**Question**: What is the correct pattern for locale-aware navigation in this project?

**Finding**: The project uses next-intl's navigation utilities exported from `@/i18n/navigation`:
- `Link` - Locale-aware link component (replaces `next/link`)
- `useRouter` - Locale-aware router hook (replaces `useRouter` from `next/navigation`)
- `usePathname` - Locale-aware pathname hook
- `redirect` - Locale-aware server redirect

**Decision**: All navigation imports must use `@/i18n/navigation` instead of `next/link` or `next/navigation`.

**Evidence**:
```typescript
// From i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
});
```

---

### 3. Locale Layout Handling

**Question**: Is the locale being correctly received and applied in the layout?

**Finding**: The layout at `app/[locale]/layout.tsx` correctly:
- Receives params as a Promise (Next.js 15+ pattern)
- Awaits the params to extract locale
- Calls `setRequestLocale(locale)` for static generation
- Passes locale to `NextIntlClientProvider`
- Sets `lang={locale}` on the HTML element

**Decision**: No changes needed to layout. Implementation is correct.

**Evidence**:
```typescript
// From app/[locale]/layout.tsx:48-60
type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ...
}
```

---

### 4. Current Fix Status

**Question**: What fixes have already been applied?

**Finding**: The following files have uncommitted changes that swap imports:

| File | Change |
|------|--------|
| `hooks/useGearEditor.ts` | `next/navigation` → `@/i18n/navigation` (useRouter) |
| `components/inventory-gallery/GearCard.tsx` | `next/link` → `@/i18n/navigation` (Link) |
| `components/loadouts/GearDetailModal.tsx` | `next/link` → `@/i18n/navigation` (Link) |
| `components/loadouts/LoadoutCard.tsx` | `next/link` → `@/i18n/navigation` (Link) |
| `components/loadouts/LoadoutHeader.tsx` | `next/link` → `@/i18n/navigation` (Link) |
| `components/layout/SiteFooter.tsx` | `next/link` → `@/i18n/navigation` (Link) |
| `app/[locale]/loadouts/page.tsx` | Minor fix |
| `app/[locale]/loadouts/new/page.tsx` | Minor fix |

**Decision**: Fixes are correct. Need to verify build passes and commit changes.

---

### 5. Remaining Files to Check

**Question**: Are there other files that might have non-locale-aware Link/Router imports?

**Finding**: Searched codebase for other occurrences. The uncommitted changes appear to cover all affected files.

**Decision**: Run full build to catch any remaining issues.

---

## Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Proxy Route | No changes needed | Fully implemented with validation and error handling |
| Navigation Pattern | Use `@/i18n/navigation` | Project standard per Feature 027 |
| Layout Handling | No changes needed | Correctly handles async params |
| Uncommitted Fixes | Commit as-is | Correct import swaps already in place |

## Alternatives Considered

1. **Manual locale prefix in paths**: Rejected - next-intl handles this automatically
2. **Custom Link wrapper**: Rejected - next-intl's createNavigation provides this
3. **Middleware-based locale detection**: Already implemented via next-intl middleware

## Next Steps

1. Run `npm run lint` to verify no errors
2. Run `npm run build` to verify TypeScript compilation
3. Commit the uncommitted fixes
4. Test navigation flows manually in both en and de locales
