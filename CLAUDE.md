# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gearshack Winterberry is a Next.js 16 application using the App Router with React 19, TypeScript (strict mode), and Tailwind CSS 4.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture: Feature-Sliced Light

This project follows a strict separation of logic from UI:

- **UI Components**: Must be stateless - receive data only via props. No `useEffect` or complex logic allowed in components.
- **Custom Hooks**: All business logic (data fetching, calculations, state management) belongs in custom hooks (e.g., `useProjectData.ts`).
- **Types**: All data models go in `@/types`.

### Directory Structure

```
app/              # Next.js App Router pages and layouts
components/ui/    # shadcn/ui components (do not create new base components)
lib/              # Utilities (cn() helper for Tailwind class merging)
hooks/            # Custom hooks for business logic
types/            # TypeScript interfaces and types
specs/            # Feature specifications (check before implementing)
```

### Import Alias

Use `@/*` for absolute imports (configured in tsconfig.json).

## Tech Stack Rules

- **Styling**: Tailwind CSS only - never create separate CSS files (except globals.css)
- **Components**: Use shadcn/ui from `@/components/ui`. Do not invent new base components.
- **TypeScript**: Strict mode enabled. No `any` types allowed.

### shadcn/ui Configuration

- Style: new-york
- Base color: zinc
- Icons: lucide-react
- CSS variables enabled

## Coding Workflow

Before writing code:
1. Check `/specs` folder for feature specifications (if exists)
2. Create TypeScript interfaces in `types/` first
3. Create the logic hook in `hooks/`
4. Create the UI component last

## Design System

- Use `flex`, `grid`, and Tailwind spacing (`gap-4`, `p-6`) for layouts
- Use shadcn components:
  - `Card` for containers
  - `Button` for actions
  - `Dialog` for modals
  - `Sheet` for mobile drawers

## Active Technologies
- TypeScript 5.x (strict mode) + Next.js 16+, React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui (001-gear-item-editor)
- Local state for MVP (no backend persistence in this feature scope) (001-gear-item-editor)
- TypeScript 5.x (strict mode) with React 19+ + Next.js 16+ (App Router), shadcn/ui, Tailwind CSS 4, lucide-reac (002-inventory-gallery)
- N/A (client-side mock data for MVP) (002-inventory-gallery)
- TypeScript 5.x (strict mode) with React 19+ + Next.js 16+ (App Router), shadcn/ui, Tailwind CSS 4, lucide-react, next/font/google (003-app-shell-branding)
- N/A (no data persistence for this feature) (003-app-shell-branding)
- TypeScript 5.x (strict mode) with React 19+ + Next.js 16+ (App Router), shadcn/ui, Tailwind CSS 4, next-themes (for dark mode) (004-nature-vibe-polish)
- localStorage for theme preference persistence (004-nature-vibe-polish)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, zustand (state management), recharts (charts), shadcn/ui (005-loadout-management)
- Browser localStorage (via zustand persist middleware) (005-loadout-management)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, shadcn/ui, recharts, Sonner (toast), next-themes (006-ui-makeover)
- Browser localStorage (via zustand persist middleware) (006-ui-makeover)
- TypeScript 5.x (strict mode) + Next.js 16+, React 19+, Tailwind CSS 4, shadcn/ui, zustand, recharts, sonner, lucide-reac (007-grand-polish-sprint)
- localStorage via zustand persist middleware (no backend) (007-grand-polish-sprint)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Firebase Auth, Firebase Firestore, Firebase Storage, shadcn/ui, Tailwind CSS 4, react-hook-form + zod, sonner (toast) (008-auth-and-profile)
- Firebase Firestore (`userBase/{uid}`), Firebase Storage (`backgrounds/hd`) (008-auth-and-profile)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-reac (009-grand-visual-polish)
- N/A (existing zustand/localStorage persistence unchanged) (009-grand-visual-polish)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + Firebase SDK (auth, firestore, storage), zustand, zod, shadcn/ui, lucide-reac (010-firestore-sync)
- Firebase Firestore (`userBase/{uid}/gearInventory`, `userBase/{uid}/loadouts`), Firebase Storage (010-firestore-sync)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Zod 4.x, shadcn/ui, Tailwind CSS 4, Firebase SDK (011-rescue-refine-bugs)
- Firebase Firestore (legacy data in `userBase/{uid}/gearInventory`) (012-visual-identity-fixes)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react, react-hook-form, Zod, Sonner (toast) (014-bugfix-sprint)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Firebase SDK (storage), Zod 4.x, sonner (toast) (015-storage-path-fix)
- Firebase Storage (`userBase/{uid}/inventory/`) - path aligned with security rules (015-storage-path-fix)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Tailwind CSS 4 (CSS filters: brightness-0 invert) (016-header-polish-sprint)
- N/A (styling changes only, no data persistence) (016-header-polish-sprint)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4, lucide-reac (017-loadouts-search-filter)
- zustand store (existing `useLoadouts` hook) (017-loadouts-search-filter)
- Firebase Firestore (`userBase/{uid}/gearInventory` - nobgImages field from Cloud Functions) (019-image-perfection)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui, Tailwind CSS 4 (020-form-completion-safety)
- Firebase Firestore (existing deleteItem handles Firestore + local state) (020-form-completion-safety)
- TypeScript 5.x (strict mode) + Next.js 16+, React 19+, Tailwind CSS 4, shadcn/ui, next-themes (021-dark-mode-logo)
- N/A (styling changes only) (021-dark-mode-logo)
- Firebase Storage (for background images - existing) (023-login-layout-repair)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, react-hook-form 7.x, shadcn/ui, Tailwind CSS 4, lucide-reac (024-image-management)
- Firebase Firestore (`userBase/{uid}/gearInventory`) - existing save logic handles null values (024-image-management)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), Firebase Firestore deleteField() (025-image-freedom-fix)
- Firebase Firestore (`userBase/{uid}/gearInventory`) - uses deleteField() for image removal, wildcard hostname in next.config.ts (025-image-freedom-fix)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router) + @imgly/background-removal (WASM), shadcn/ui (Switch), Firebase Storage (026-client-bg-removal)
- Firebase Storage (existing - uploads processed PNG) (026-client-bg-removal)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + next-intl (i18n), next/navigation (routing), shadcn/ui (UI components) (027-i18n-next-intl)
- N/A (locale determined by URL, no persistence needed) (027-i18n-next-intl)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + next-intl (from Feature 027), shadcn/ui, Tailwind CSS 4, lucide-reac (028-landing-page-i18n)
- N/A (landing page is stateless; auth state from existing Firebase Auth) (028-landing-page-i18n)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + Next.js Server Actions, Serper.dev Images API, shadcn/ui (Button, AspectRatio), react-hook-form (030-integrated-image-search)
- N/A (no persistence - just API calls and form field population) (030-integrated-image-search)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + react-hook-form 7.x, Zod 4.x, shadcn/ui, Tailwind CSS 4, sonner (toast), next-intl (031-search-save-i18n-fix)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + Firebase Storage, sonner (toast), existing `uploadGearImage` service (032-secure-asset-pipeline)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+ + next-intl (i18n), existing `@/i18n/navigation` module (034-nav-i18n-rescue)
- N/A (no data changes) (034-nav-i18n-rescue)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, next-intl, shadcn/ui (035-repair-sprint)
- Firebase Firestore + Firebase Storage (035-repair-sprint)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, @imgly/background-removal (WASM), next-cloudinary or cloudinary-upload-widget, shadcn/ui, Tailwind CSS 4 (038-cloudinary-hybrid-upload)
- Firebase Firestore (`userBase/{uid}/gearInventory`), Cloudinary (image assets) (038-cloudinary-hybrid-upload)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Tailwind CSS 4, shadcn/ui, lucide-react, next-cloudinary (039-product-search-cloudinary)
- Cloudinary (via existing unsigned upload preset), Firebase Firestore (existing gear items) (039-product-search-cloudinary)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, react-hook-form, zod, shadcn/ui (040-supabase-migration)
- PostgreSQL (Supabase), Cloudinary (images - unchanged) (040-supabase-migration)
- TypeScript 5.x (strict mode) + React 19+ + Next.js 16 (App Router) + @supabase/supabase-js, @react-google-maps/api (new), react-hook-form, zod, shadcn/ui (041-loadout-ux-profile)
- PostgreSQL (Supabase), Cloudinary (images) (041-loadout-ux-profile)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router) + @supabase/supabase-js, @supabase/ssr, zod (validation), react-hook-form (existing) (042-catalog-sync-api)
- PostgreSQL (Supabase) with pg_trgm and pgvector extensions (042-catalog-sync-api)
- TypeScript 5.x (strict mode) + @supabase/supabase-js, zod (validation), tsx (script runner) (043-ontology-i18n-import)
- PostgreSQL (Supabase) - `categories` table (043-ontology-i18n-import)
- TypeScript 5.x (strict mode) + Next.js 16+, React 19+, @supabase/supabase-js, react-hook-form, zod, shadcn/ui (044-intelligence-integration)
- PostgreSQL (Supabase) with `categories` and `catalog_brands` tables (044-intelligence-integration)

## Recent Changes
- 001-gear-item-editor: Added TypeScript 5.x (strict mode) + Next.js 16+, React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui
- Always try tp try run multiple subagents in parallel to speed up development. In this (Next.js) project, always ONLY use the nextjs-gearshack-architect type subagent.
