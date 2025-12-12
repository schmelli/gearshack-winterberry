# GearShack Copilot Instructions

This document provides comprehensive guidance for GitHub Copilot when working with the GearShack codebase.

## 🏗️ Tech Stack

- **Framework**: Next.js 16+ (App Router) with React 19
- **Language**: TypeScript 5.x (strict mode enabled - **NO `any` types allowed**)
- **Styling**: Tailwind CSS 4 only (no separate CSS files except globals.css)
- **UI Components**: shadcn/ui with "new-york" style preset
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password, Google OAuth)
- **Images**: Cloudinary (storage and optimization)
- **Internationalization**: next-intl (English and German support)
- **Form Management**: react-hook-form with Zod validation
- **State Management**: Zustand for global state
- **Icons**: lucide-react

## 🎯 Architecture: "Feature-Sliced Light"

We strictly separate business logic from UI presentation.

### Core Principles

1. **UI Components** (`components/`)
   - MUST be stateless and receive data via props only
   - MUST NOT contain `useEffect` or complex business logic
   - MUST use shadcn/ui components from `@/components/ui`
   - Start with `'use client'` directive when using hooks or interactivity
   - Include feature references in header comments

2. **Custom Hooks** (`hooks/`)
   - ALL business logic, data fetching, and state management lives here
   - Named with `use` prefix (e.g., `useGearEditor`, `useLoadouts`)
   - Include feature specification references in header comments
   - Handle form state with `react-hook-form` and Zod validation

3. **Types** (`types/`)
   - ALL data models and interfaces defined here
   - Use strict TypeScript - NO `any` types
   - Export type definitions, enums, and constants
   - Include UI labels for enums (e.g., `GEAR_STATUS_LABELS`)

4. **Utilities** (`lib/`)
   - Pure functions for data transformation and formatting
   - Organized by domain (e.g., `gear-utils.ts`, `loadout-utils.ts`)
   - No side effects or state management

## 📁 Project Structure

```
app/
  [locale]/              # i18n routes (en, de)
    inventory/           # Gear inventory pages
    loadouts/            # Loadout management pages
    login/               # Authentication pages
    settings/            # User settings
  api/                   # API route handlers
components/
  ui/                    # shadcn/ui base components (DO NOT modify directly)
  auth/                  # Authentication components
  gear-editor/           # Gear item editor form and sections
  gear-detail/           # Gear detail modal
  inventory-gallery/     # Inventory grid and cards
  landing/               # Landing page sections
  layout/                # App shell, header, footer
  loadouts/              # Loadout management components
  profile/               # User profile components
hooks/                   # Custom React hooks (business logic)
lib/
  supabase/              # Supabase client and database helpers
  validations/           # Zod schemas for form validation
  cloudinary/            # Cloudinary configuration
  taxonomy/              # Taxonomy utilities
types/                   # TypeScript type definitions
messages/                # i18n translation files (en.json, de.json)
public/                  # Static assets
specs/                   # Feature specifications (READ these for context!)
supabase/                # Database migrations and schemas
```

## 🎨 Coding Conventions

### Imports

- Always use `@/*` import alias for absolute imports
- Order imports: external packages → internal modules → types → components
- Use `@/i18n/navigation` for navigation (NOT `next/navigation`)

```typescript
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { GearItem } from '@/types/gear';
import { Button } from '@/components/ui/button';
```

### Components

- Use functional components with TypeScript
- Props interfaces should be exported (e.g., `export interface GearCardProps`)
- Include JSDoc comments with feature references
- Use destructured props

```typescript
/**
 * GearCard Component
 * 
 * Feature: 002-inventory-gallery
 * Displays a gear item card with image, name, weight, and actions
 */

'use client';

export interface GearCardProps {
  item: GearItem;
  density?: ViewDensity;
  onEdit?: () => void;
}

export function GearCard({ item, density = 'comfortable', onEdit }: GearCardProps) {
  // Component implementation
}
```

### Styling

- Use Tailwind CSS utility classes exclusively
- Use `cn()` utility from `@/lib/utils` to merge class names
- Follow shadcn/ui patterns for component variants
- Responsive design: mobile-first with `sm:`, `md:`, `lg:` breakpoints

```typescript
<div className={cn(
  "flex items-center gap-2 p-4",
  density === 'compact' && "p-2",
  className
)}>
```

### Forms

- Use `react-hook-form` with Zod validation
- Define schemas in `lib/validations/`
- Form logic goes in custom hooks
- Use shadcn/ui `Form` components

```typescript
// In hook
const form = useForm<GearItemFormData>({
  resolver: zodResolver(gearItemFormSchema),
  defaultValues: DEFAULT_GEAR_ITEM_FORM,
});

// In component
<Form {...form}>
  <FormField name="name" control={form.control} />
</Form>
```

### State Management

- Use Zustand store (`hooks/useSupabaseStore.ts`) for global state
- Local state with `useState` for UI-only state
- Server state with custom hooks that fetch from Supabase

### i18n

- Use `next-intl` for translations
- Translation keys in `messages/en.json` and `messages/de.json`
- Use `useTranslations()` hook in components
- Navigation via `@/i18n/navigation`

```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('InventoryPage');
<h1>{t('title')}</h1>
```

## 🔌 Data & APIs

### Supabase

- Client creation: `lib/supabase/client.ts` (client) or `lib/supabase/server.ts` (server)
- Database types: `types/supabase.ts` (auto-generated)
- Use transformers in `lib/supabase/transformers.ts` to convert DB types to app types
- Authentication: `hooks/useSupabaseAuth.ts` and `components/auth/SupabaseAuthProvider.tsx`

### Cloudinary

- Upload configuration: `lib/cloudinary/config.ts`
- Use `useCloudinaryUpload` hook for uploads
- Image optimization with `next-cloudinary` Image component

### API Routes

- Located in `app/api/`
- Use Next.js 16 App Router route handlers
- Return `Response` objects with proper status codes
- Handle errors gracefully with try-catch

## 📋 Common Workflows

### Spec-Driven Development

**ALWAYS check `/specs` folder before implementing features!**

1. Read the specification markdown in `/specs/{feature-number}-{feature-name}/`
2. Review `spec.md`, `tasks.md`, and contract files
3. Create TypeScript interfaces in `types/` first
4. Create the business logic hook in `hooks/`
5. Create the UI component last
6. Follow existing patterns and code style

### Adding a New Feature

1. Create types in `types/{domain}.ts`
2. Add Zod validation schema in `lib/validations/{domain}-schema.ts`
3. Create custom hook in `hooks/use{Feature}.ts`
4. Create component in `components/{domain}/{Feature}.tsx`
5. Add translations to `messages/en.json` and `messages/de.json`
6. Update navigation if needed in `lib/constants/navigation.ts`

### Creating a Form

1. Define form data type and default values in `types/`
2. Create Zod schema in `lib/validations/`
3. Create hook with `useForm` from react-hook-form
4. Create UI component with shadcn/ui Form components
5. Handle submission in the hook, not the component

### Working with Images

- Use Cloudinary for image storage
- Use `getOptimizedImageUrl()` from `lib/gear-utils.ts` for image URLs
- Use Next.js `Image` component for optimization
- Background removal available via `@imgly/background-removal`

## 🛠️ Utilities & Helpers

### Common Functions

- `formatWeight()` - Format weights with thousands separators (`lib/loadout-utils.ts`)
- `formatWeightForDisplay()` - Format weight with unit (`lib/gear-utils.ts`)
- `cn()` - Merge Tailwind classes (`lib/utils.ts`)
- `getCategoryLabel()` - Get category display name (`lib/taxonomy/taxonomy-utils.ts`)

### Weight Handling

- Always store weights in grams internally
- Use weight formatting utilities for display
- Weight categories: Ultralight (<4.5kg), Lightweight (<6.8kg), Traditional (<11.3kg)

### Category Labels

- Use `CATEGORY_LABELS` constant from `lib/loadout-utils.ts`
- Categories: shelter, sleep-system, packs, clothing, cooking, water, electronics, miscellaneous, first-aid

## 🔒 Security & Best Practices

- **Never** use `any` type - TypeScript strict mode is enforced
- Escape HTML special characters when generating dynamic HTML
- Use double-quote escaping for CSV exports (`" -> ""`)
- Validate all user inputs with Zod schemas
- Use Row Level Security (RLS) in Supabase
- Never expose API keys in client-side code
- Use environment variables for sensitive configuration

## 🧪 Testing & Validation

- Run `npm run lint` before committing
- Build with `npm run build` to check for type errors
- Test in development mode with `npm run dev`
- Verify i18n by testing in both English and German
- Test responsive design on mobile and desktop viewports
- Verify forms handle validation errors properly

## 💡 Common Patterns

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

<Button disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

### Error Handling

```typescript
import { toast } from 'sonner';

try {
  await someAsyncFunction();
  toast.success('Success message');
} catch (error) {
  console.error('Error:', error);
  toast.error('Error message');
}
```

### Conditional Rendering

```typescript
{items.length === 0 ? (
  <EmptyState />
) : (
  <ItemList items={items} />
)}
```

## 📚 Key Dependencies

- `@supabase/supabase-js` - Supabase client
- `react-hook-form` - Form management
- `zod` - Schema validation
- `zustand` - State management
- `next-intl` - Internationalization
- `next-cloudinary` - Cloudinary integration
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `class-variance-authority` - Component variants
- `tailwind-merge` - Merge Tailwind classes

## 🎓 Learning Resources

- Check `/specs` folder for feature specifications and context
- Review `PROJECT_RULES.md` for architecture principles
- See `README.md` for project overview and setup
- Refer to existing components for patterns and conventions

---

## 🤖 Byterover MCP Integration

[byterover-mcp]

You are given two tools from Byterover MCP server:

### 1. `byterover-store-knowledge`
You **MUST** always use this tool when:

- Learning new patterns, APIs, or architectural decisions from the codebase
- Encountering error solutions or debugging techniques
- Finding reusable code patterns or utility functions
- Completing any significant task or plan implementation

### 2. `byterover-retrieve-knowledge`
You **MUST** always use this tool when:

- Starting any new task or implementation to gather relevant context
- Before making architectural decisions to understand existing patterns
- When debugging issues to check for previous solutions
- Working with unfamiliar parts of the codebase

---

**Remember**: Quality over speed. Follow the established patterns, maintain type safety, and write clean, maintainable code that respects the architecture.
