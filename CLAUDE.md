# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Wiki

**NEW**: Comprehensive documentation is now in `/docs/`

- **[System Architecture](docs/architecture/overview.md)** - Start here for understanding the system
- **[Feature Documentation](docs/features/)** - Implementation details for all features
- **[Development Guides](docs/guides/)** - Setup, deployment, debugging
- **[Architecture Decisions (ADRs)](docs/decisions/)** - Historical context for key decisions

**Quick Links:**
- [Observational Memory](docs/features/observational-memory.md)
- [Mastra Studio Guide](docs/guides/mastra-studio.md)
- [Database Schema](docs/architecture/database-schema.md)

## Project Overview

Gearshack Winterberry is a Next.js 16 application using the App Router with React 19, TypeScript (strict mode), and Tailwind CSS 4.

## Git Workflow

- **Default branch**: `development` - ALL PRs must target this branch
- **Never** target `main`, `master`, or feature branches like `003-app-shell-branding`
- Feature branches: `{feature-number}-{feature-name}` (e.g., `051-community-bulletin-board`)

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

## Internationalization (i18n) Rules

This project uses `next-intl` for internationalization. **ALL user-visible text must be internationalized.**

### Required Practices

1. **Use `useTranslations` hook** in components:
   ```tsx
   const t = useTranslations('Namespace');
   return <p>{t('key')}</p>;
   ```

2. **Never hardcode visible text** in TSX files:
   - ❌ `<p>Hello World</p>`
   - ✅ `<p>{t('greeting')}</p>`

3. **Translation files location**: `messages/en.json` and `messages/de.json`

4. **Namespace convention**: Use PascalCase for top-level namespaces (`Social`, `Settings`, `Messaging`)

### Automated i18n Audit

A Claude Code hook (`.claude/hooks/i18n-audit.sh`) automatically runs after editing TSX files and warns about potential hardcoded strings. The hook checks for:
- Text content after `>` that starts with uppercase letters
- Hardcoded `title=`, `description=`, `label=` attributes

If the hook reports issues, add the missing translations to both `en.json` and `de.json`.

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

### Z-Index Hierarchy

When using z-index in Tailwind classes, follow this documented hierarchy to prevent conflicts:

- `z-0` - Base level (default)
- `z-10` - Dropdowns, popovers
- `z-20` - Sticky elements (e.g., table headers)
- `z-30` - Fixed navigation elements
- `z-40` - Sticky tabs, community nav (e.g., Community Hub tabs)
- `z-50` - Main header, navigation bar
- `z-[60]` - Overlays (Sheet, Dialog backdrops)
- `z-[70]` - Modals, Dialogs
- `z-[80]` - Toasts, notifications (Sonner)
- `z-[100]` - Critical overlays, fullscreen modals

## Key Patterns & Utilities

### AI Image Generation (Feature 048)
- **Vercel AI SDK Integration**: Server-side AI generation via `lib/vercel-ai.ts` using Vercel AI SDK with AI Gateway (model: nano-banana-pro)
- **CDN Storage**: Generated images uploaded to Cloudinary for CDN hosting and optimization
- **Prompt Engineering**: `lib/prompt-builder.ts` - constructs AI prompts from structured metadata (activity types, seasons, style preferences)
- **Retry/Fallback Pattern**: State machine in custom hooks with automatic retry (1 attempt) → silent fallback to curated images
- **Contrast Compliance**: `lib/contrast-analyzer.ts` - WCAG AA compliance (4.5:1 ratio), luminance calculation, dynamic text color
- **Image History Management**: Max 3 images per loadout with auto-deletion of oldest, stored in `generated_images` table
- **Fallback Images**: 24 curated images (6 activities × 4 seasons) in `public/fallback-images/`, seeded via `scripts/seed-fallback-images.ts`
- **API Routes**: 5 dedicated routes in `/api/loadout-images/` - generate, save-fallback, history, set-active, delete
- **Environment Variables**: AI config in `.env.local` (AI_GENERATION_ENABLED, AI_IMAGE_MODEL) + Cloudinary for storage (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)

### State Management Patterns
- **Complex Async Flows**: State machines with status tracking (idle → generating → retrying → success/error/fallback)
- **Optimistic Updates**: Zustand with rollback on errors
- **Feature-Sliced Light**: Business logic in custom hooks, stateless UI components

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
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, shadcn/ui (Dialog, Sheet), Tailwind CSS 4, zustand (state), zod (validation) (045-gear-detail-modal)
- PostgreSQL (Supabase) - existing gear_items table + new api_cache table (045-gear-detail-modal)
- TypeScript 5.x (strict mode) + Next.js 16.0.7 (App Router) + React 19.2.0 + @supabase/supabase-js 2.87.1, @supabase/ssr 0.8.0, Zustand 5.0.9, react-hook-form 7.68.0, Zod 4.1.13, shadcn/ui, next-cloudinary 6.17.5, Sonner 2.0.7 (046-user-messaging-system)
- PostgreSQL (Supabase) for messages/conversations/relationships, Cloudinary for images/voice messages (046-user-messaging-system)
- TypeScript 5.x (strict mode) + react-hook-form 7.x, Zod 4.x, shadcn/ui, next-intl, zustand (047-loadout-creation-form)
- PostgreSQL (Supabase) - existing `loadouts` table with `seasons`, `activity_types`, `description` columns (047-loadout-creation-form)
- TypeScript 5.x (strict mode) + Next.js 16.0.7 (App Router), React 19.2.0, Vercel AI SDK (ai npm package), cloudinary (for CDN storage), @supabase/supabase-js 2.87.1, @supabase/ssr 0.8.0, zod 4.1.13, react-hook-form 7.68.0, sonner 2.0.7, shadcn/ui, dotenv 17.2.3 (048-ai-loadout-image-gen)
- PostgreSQL (Supabase) - `generated_images` table for AI image history, extended `loadouts` table with `hero_image_id`; Vercel AI SDK for image generation via AI Gateway, Cloudinary for CDN hosting (048-ai-loadout-image-gen)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, Supabase (PostgreSQL), Zustand, shadcn/ui, react-hook-form, Zod, Sonner, next-intl (049-wishlist-view)
- Supabase (PostgreSQL) - existing gear_items table with status='wishlist', new fuzzy matching functions (049-wishlist-view)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, Zustand, react-hook-form, Zod, shadcn/ui, Sonner, next-intl (001-social-graph)
- PostgreSQL (Supabase) - new `friend_requests`, `friendships`, `user_follows`, `friend_activities` tables; extends `profiles` and `notifications` (001-social-graph)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, shadcn/ui, Tailwind CSS 4, Zustand, react-hook-form + Zod, Sonner, lucide-react, next-intl (051-community-bulletin-board)
- Supabase (PostgreSQL) with RLS policies (051-community-bulletin-board)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, Zustand, react-hook-form, Zod, shadcn/ui, Sonner, next-intl, lucide-reac (001-community-shakedowns)
- PostgreSQL (Supabase) with RLS policies (001-community-shakedowns)
- TypeScript 5.x (strict mode) + Next.js 16+ (App Router), React 19+, shadcn/ui, react-hook-form + Zod, Zustand, next-intl, Sonner (052-vip-loadouts)
- Supabase (PostgreSQL) with PostGIS extension for geospatial queries (053-merchant-integration)

## Recent Changes
- 001-social-graph: COMPLETED dual-tier social connection system (Friends + Follow). Implemented 71 tasks across 10 phases. Core features: Following (one-click, no approval), Friend Requests (require prior message exchange, rate limited 20/day, 30-day expiry), Friends List with search/filter/sort, Activity Feed with Realtime subscriptions, Online Presence (5-min inactivity timeout, graceful degradation), Privacy Settings (presets + granular controls), Mutual Friends display. New patterns: canonical friendship ordering (user_id < friend_id), O(1) follow/friend checks with useMemo Sets, state machine for async operations, optimistic updates with rollback. Architecture: `hooks/social/` (useFollowing, useFollowers, useFriendRequests, useFriendships, useFriendActivity, useOnlineStatus, useSocialPrivacy, useMutualFriends), `components/social/` (FollowButton, FriendRequestButton, FriendsList, FriendActivityFeed, OnlineStatusIndicator, PrivacySettingsPanel, MutualFriendsDisplay, etc.). Database: `friend_requests`, `friendships`, `user_follows`, `friend_activities` tables; RPC functions for atomic operations. See `specs/001-social-graph/` for complete specification.
- 048-ai-loadout-image-gen: Implemented AI-powered hero image generation for loadouts using Vercel AI SDK with AI Gateway. New patterns: state machine for async operations with retry/fallback logic, prompt engineering from structured metadata, WCAG AA contrast compliance (4.5:1 ratio), client-side image brightness analysis with canvas API, Vercel AI SDK for generation + Cloudinary for CDN storage. Architecture: Feature-Sliced Light with `useLoadoutImageGeneration` hook containing all business logic, stateless UI components (LoadoutHeroImageSection, ImageGenerationButton, etc.), 5 dedicated API routes (/api/loadout-images/*). Database: new `generated_images` table with image history (max 3 per loadout), JSONB columns for style preferences. Environment: requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, AI_GENERATION_ENABLED, AI_IMAGE_MODEL in .env.local.
- 001-gear-item-editor: Added TypeScript 5.x (strict mode) + Next.js 16+, React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui
- Always try tp try run multiple subagents in parallel to speed up development. In this (Next.js) project, always ONLY use the nextjs-gearshack-architect type subagent.

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
