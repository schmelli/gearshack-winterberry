# Implementation Plan: Stabilization Sprint - i18n, Image Domains & MIME Fixes

**Branch**: `036-stabilization-sprint` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-stabilization-sprint/spec.md`

## Summary

This stabilization sprint fixes three critical bugs affecting core functionality:
1. **i18n FORMATTING_ERROR**: The inventory page crashes because `t('showingItems')` is called without passing the required `{filtered, total}` parameters
2. **Image Domain Restriction**: Already fixed - `next.config.ts` has `hostname: '**'` wildcard
3. **MIME Type Validation**: The `importExternalImage` function may create File objects with invalid MIME types, causing Firebase Storage rejection

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, next-intl, shadcn/ui
**Storage**: Firebase Firestore + Firebase Storage
**Testing**: npm run lint, npm run build (no automated test suite)
**Target Platform**: Web (Browser)
**Project Type**: Web application (Next.js App Router with i18n)
**Performance Goals**: Standard web app response times
**Constraints**: Must preserve backward compatibility with existing data
**Scale/Scope**: Single application with 2 supported locales (en, de)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light Architecture | PASS | Changes are in page and hook files appropriately |
| II. TypeScript Strict Mode | PASS | All changes use proper typing |
| III. Design System Compliance | N/A | No UI component changes |
| IV. Spec-Driven Development | PASS | Spec exists at /specs/036-stabilization-sprint/spec.md |
| V. Import and File Organization | PASS | Using @/* path alias |

**Code Quality Gates**:
- [ ] `npm run lint` passes
- [ ] `npm run build` completes successfully
- [ ] All TypeScript errors resolved

## Project Structure

### Documentation (this feature)

```text
specs/036-stabilization-sprint/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - Research findings
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Affected Files
app/
└── [locale]/
    └── inventory/
        └── page.tsx           # i18n parameter fix (US1)

hooks/
└── useGearEditor.ts           # MIME type sanitization (US3)

next.config.ts                 # Already fixed - wildcard domains (US2)

messages/
├── en.json                    # Verify message format
└── de.json                    # Verify message format

components/
└── inventory-gallery/
    └── GalleryToolbar.tsx     # Receives translations via props
```

**Structure Decision**: Single Next.js web application with App Router.

## Complexity Tracking

No constitution violations. All changes are simple bug fixes.

## Findings Summary

### Issue 1: i18n FORMATTING_ERROR

**Root Cause**: The inventory page passes `t('showingItems')` directly without parameters, but the message definition requires `{filtered}` and `{total}`.

**Current Code** (`app/[locale]/inventory/page.tsx:99`):
```typescript
showingItems: t('showingItems'),
```

**Message Definition** (`messages/en.json:131`):
```json
"showingItems": "Showing {filtered} of {total} items"
```

**Fix**: The GalleryToolbar does its own string replacement. Two options:
- Option A: Pass raw translation string (current approach) - but next-intl's strict mode requires parameters
- Option B: Pre-format the string with parameters before passing to GalleryToolbar

**Selected Approach**: The GalleryToolbar already handles parameter substitution via string replacement. The issue is that next-intl throws when placeholders are defined but not provided. We need to either:
1. Change the i18n message format to not require parameters (let GalleryToolbar do the substitution), OR
2. Pass the parameters to `t()` and change GalleryToolbar to use the pre-formatted string

**Decision**: Use Option 2 - pass parameters to `t()` for proper i18n handling.

### Issue 2: Image Domain Restriction

**Status**: Already fixed in `next.config.ts`:
```typescript
remotePatterns: [
  {
    protocol: 'https',
    hostname: '**',
  },
],
```

No action needed.

### Issue 3: MIME Type Validation

**Root Cause**: The `importExternalImage` function in `useGearEditor.ts` creates a File object using the content-type from the proxy response. If the proxy returns an invalid or missing content-type, the File's MIME type may not match Firebase Storage's `image/*` requirement.

**Current Code** (`hooks/useGearEditor.ts:73-78`):
```typescript
const blob = await response.blob();
const contentType = response.headers.get('content-type') || 'image/jpeg';
const extension = getExtensionFromContentType(contentType);
const timestamp = Date.now();

return new File([blob], `imported_${timestamp}${extension}`, { type: contentType });
```

**Potential Issue**: If proxy returns `application/octet-stream` or empty content-type, the File will have an invalid MIME type.

**Fix**: Validate and sanitize the content-type before creating the File:
```typescript
const rawContentType = response.headers.get('content-type') || '';
const contentType = rawContentType.startsWith('image/') ? rawContentType : 'image/jpeg';
```
