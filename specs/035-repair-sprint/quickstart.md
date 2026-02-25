# Quickstart: Repair Sprint - Proxy Route & Navigation Fixes

**Feature**: 035-repair-sprint
**Date**: 2025-12-08

## Prerequisites

- Node.js 18+
- npm or pnpm
- Access to the repository

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Uncommitted Fixes

Check that all navigation import fixes are in place:

```bash
git diff --stat
```

Expected modified files:
- `hooks/useGearEditor.ts`
- `components/inventory-gallery/GearCard.tsx`
- `components/loadouts/GearDetailModal.tsx`
- `components/loadouts/LoadoutCard.tsx`
- `components/loadouts/LoadoutHeader.tsx`
- `components/layout/SiteFooter.tsx`
- `app/[locale]/loadouts/page.tsx`
- `app/[locale]/loadouts/new/page.tsx`

### 3. Run Lint Check

```bash
npm run lint
```

### 4. Build the Application

```bash
npm run build
```

### 5. Start Development Server

```bash
npm run dev
```

### 6. Manual Testing

1. **Test Navigation in English locale**:
   - Navigate to `http://localhost:3000/en/inventory`
   - Click "Edit" on any gear item
   - Verify URL is `/en/inventory/{id}/edit`

2. **Test Navigation in German locale**:
   - Navigate to `http://localhost:3000/de/inventory`
   - Click "Edit" on any gear item
   - Verify URL is `/de/inventory/{id}/edit`

3. **Test Image Save**:
   - Create/edit a gear item
   - Use the image search to select an external image
   - Save the item
   - Verify no "Failed to save" error

4. **Check Console for i18n Errors**:
   - Open browser developer tools
   - Navigate through the app
   - Verify no "invalid language tag" errors

## Key Files

| File | Purpose |
|------|---------|
| `i18n/navigation.ts` | Locale-aware navigation exports |
| `i18n/config.ts` | Supported locales configuration |
| `app/api/proxy-image/route.ts` | Image proxy endpoint |
| `app/[locale]/layout.tsx` | Root layout with i18n provider |

## Troubleshooting

### "Failed to save" Error

1. Check browser network tab for `/api/proxy-image` request
2. Verify the external image URL is accessible
3. Check for specific error in response (TIMEOUT, NOT_IMAGE, etc.)

### 404 on Navigation

1. Verify component uses `Link` from `@/i18n/navigation`
2. Check that href does not manually include locale prefix
3. Locale is automatically prepended by next-intl

### "Invalid language tag" Error

1. Check that locale is being awaited in layout
2. Verify `setRequestLocale` is called
3. Ensure middleware is properly configured
