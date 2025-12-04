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

## Recent Changes
- 001-gear-item-editor: Added TypeScript 5.x (strict mode) + Next.js 16+, React 19+, react-hook-form 7.x, Zod 4.x, shadcn/ui
