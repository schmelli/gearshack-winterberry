# Implementation Plan: Internationalization with next-intl

**Branch**: `027-i18n-next-intl` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-i18n-next-intl/spec.md`

## Summary

Implement internationalization support for the Gearshack application using `next-intl`. This involves:
1. Installing `next-intl` and configuring locale-based routing
2. Migrating all routes from `app/` to `app/[locale]/` structure
3. Creating translation files for English (default) and German
4. Adding a language switcher to the header
5. Ensuring existing providers (Auth, Sync, Theme) continue to work

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+
**Primary Dependencies**: next-intl (i18n), next/navigation (routing), shadcn/ui (UI components)
**Storage**: N/A (locale determined by URL, no persistence needed)
**Testing**: Manual testing + `npm run lint` + `npm run build`
**Target Platform**: Web (modern browsers)
**Project Type**: Next.js App Router web application
**Performance Goals**: No additional page load time (translations bundled per locale)
**Constraints**: Must not break existing Auth, Sync, or Theme providers
**Scale/Scope**: ~10 files modified, 4-5 new files created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Feature-Sliced Light Architecture**: i18n configuration in `i18n/`, translation hook usage in components (stateless)
- [x] **TypeScript Strict Mode**: All i18n code fully typed, message keys type-safe
- [x] **Design System Compliance**: Uses existing shadcn/ui Button component for language switcher
- [x] **Spec-Driven Development**: Full spec created before implementation
- [x] **Import Organization**: Uses `@/*` path aliases

## Project Structure

### Documentation (this feature)

```text
specs/027-i18n-next-intl/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Step-by-step implementation guide
├── checklists/
│   └── requirements.md  # Validation checklist
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
# New files
i18n/
├── config.ts            # Locale configuration (locales, defaultLocale)
├── request.ts           # getRequestConfig for server components
└── navigation.ts        # Locale-aware Link, useRouter, etc.

messages/
├── en.json              # English translations
└── de.json              # German translations

middleware.ts            # Locale detection and routing middleware
global.d.ts             # TypeScript declarations for message keys

# Modified files (migration)
app/
└── [locale]/            # All pages moved here
    ├── layout.tsx       # Root layout with NextIntlClientProvider
    ├── page.tsx         # Home page
    ├── inventory/
    ├── loadouts/
    ├── login/
    └── settings/

components/
└── layout/
    ├── SiteHeader.tsx   # Add language switcher, use translations
    └── LanguageSwitcher.tsx  # NEW: Toggle between EN/DE
```

**Structure Decision**: Following next-intl's recommended App Router structure with `[locale]` dynamic segment. Configuration centralized in `i18n/` directory.

## Complexity Tracking

No violations - this feature aligns with all constitution principles.

## Implementation Phases

### Phase 1: Setup

1. Install `next-intl` dependency
2. Create `i18n/config.ts` with locale configuration
3. Create `middleware.ts` for locale detection

### Phase 2: Translation Files

1. Create `messages/en.json` with initial keys
2. Create `messages/de.json` with German translations
3. Create `global.d.ts` for type-safe message keys

### Phase 3: The Great Migration

1. Create `app/[locale]/` directory structure
2. Move all routes to `app/[locale]/`
3. Update root layout to use NextIntlClientProvider
4. Ensure providers (Auth, Sync, Theme) remain intact

### Phase 4: Component Updates

1. Create `LanguageSwitcher.tsx` component
2. Update `SiteHeader.tsx` to use translations and language switcher
3. Update navigation constants to support i18n

### Phase 5: Validation

1. Run `npm run lint`
2. Run `npm run build`
3. Manual testing per spec acceptance criteria

## References

- [research.md](./research.md) - Decision records
- [quickstart.md](./quickstart.md) - Implementation steps
- [spec.md](./spec.md) - Full requirements
