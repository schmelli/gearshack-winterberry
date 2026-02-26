# Tech Stack

Complete reference of all technologies, frameworks, libraries, and tools used in Gearshack.

## Core Stack

### Runtime & Framework

#### Node.js `>=22.13.0`
**Purpose**: JavaScript runtime
**Why**: Latest LTS with native ESM support, performance improvements
**Key Features**:
- Native Web Streams
- Fetch API built-in
- Better TypeScript integration

#### Next.js `^16.1.1`
**Purpose**: React meta-framework
**Why**: App Router, Server Components, best-in-class DX
**Key Features**:
- App Router (over Pages Router)
- React Server Components
- Streaming SSR
- Built-in image optimization
- Edge Runtime support
- Turbopack (faster than Webpack)

**Build Modes**:
```bash
npm run build       # Webpack (more stable, used in production)
npm run build:turbo # Turbopack (faster, experimental)
```

#### React `19.2.0`
**Purpose**: UI library
**Why**: Latest React with React Compiler
**New Features in 19**:
- React Compiler (automatic memoization)
- useTransition improvements
- Better Suspense
- Actions and Form

#### TypeScript `^5.x` (strict mode)
**Purpose**: Type safety
**Why**: Catch bugs at compile time, better DX
**Configuration**:
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

**No `any` types allowed** (enforced via ESLint)

---

## Styling & UI

### Tailwind CSS `^4.x`
**Purpose**: Utility-first CSS framework
**Why**: Rapid development, consistency, zero runtime
**Configuration**:
- JIT mode (Just-In-Time compilation)
- CSS variables for themes
- Custom colors from `zinc` palette

**Best Practices**:
- Use `cn()` utility for class merging
- Never create separate CSS files (except globals.css)
- Mobile-first responsive design

### shadcn/ui
**Purpose**: Base component library
**Why**: Unstyled, accessible, composable, copy-paste
**Style**: `new-york`
**Base Color**: `zinc`
**Icons**: `lucide-react`

**Components Used**:
- Accordion, Alert Dialog, Avatar
- Button, Card, Checkbox
- Dialog, Dropdown Menu, Form
- Input, Label, Popover
- Progress, Radio Group, Select
- Separator, Sheet, Slider
- Switch, Tabs, Toast (Sonner)
- Tooltip

**Important**: Do NOT create new base components. Use shadcn/ui or compose existing ones.

### Lucide React `^0.555.0`
**Purpose**: Icon library
**Why**: Tree-shakeable, beautiful, consistent
**Usage**:
```tsx
import { Search, User, Settings } from 'lucide-react';
<Search className="h-4 w-4" />
```

### next-themes `^0.4.6`
**Purpose**: Theme switching (light/dark/system)
**Why**: Built for Next.js, SSR-safe, no flash
**Configuration**:
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

---

## Backend & Database

### Supabase
**Purpose**: Backend-as-a-Service
**Why**: PostgreSQL, Auth, Storage, Realtime, RLS

#### @supabase/supabase-js `^2.87.1`
**Purpose**: Client library
**Key Features**:
- Auto-refreshing JWT tokens
- Connection pooling
- Type-safe queries (with codegen)
- Realtime subscriptions

#### @supabase/ssr `^0.8.0`
**Purpose**: Server-side rendering support
**Why**: Correct cookie handling in Server Components
**Usage**:
```typescript
// Server Component
import { createServerClient } from '@/lib/supabase/server';
const supabase = createServerClient();

// Client Component
import { createBrowserClient } from '@/lib/supabase/client';
const supabase = createBrowserClient();
```

### PostgreSQL Extensions

#### pgvector
**Purpose**: Vector similarity search
**Why**: Semantic recall for AI agent
**Usage**:
```sql
-- Store embeddings
embedding vector(1536)

-- Search by similarity
ORDER BY embedding <=> query_embedding
```

#### pg_trgm
**Purpose**: Fuzzy text matching
**Why**: Typo-tolerant search for gear/brands
**Usage**:
```sql
-- Trigram index
CREATE INDEX idx_name ON table USING gin(name gin_trgm_ops);

-- Fuzzy search
WHERE similarity(name, 'Arc teryx') > 0.3
```

#### PostGIS
**Purpose**: Geospatial queries
**Why**: Merchant location search
**Usage**:
```sql
-- Store location
location_point GEOGRAPHY(POINT)

-- Find nearby
WHERE ST_DWithin(location_point, user_location, 50000) -- 50km
```

---

## AI & Agent

### Mastra `^1.0.1`
**Purpose**: AI agent framework
**Why**: Multi-tier memory, tool orchestration, observability
**Key Features**:
- Four-tier memory (Working, History, Semantic, Observational)
- Tool calling with streaming
- OpenTelemetry tracing
- Mastra Studio for debugging

#### @mastra/core `^1.0.4`
**Purpose**: Core agent functionality
**Includes**: Agent class, tool system, streaming

#### @mastra/memory `^1.0.0`
**Purpose**: Memory management
**Features**:
- Working Memory (Zod schema)
- Message History
- Semantic Recall (vector search)
- **Observational Memory** (new in 1.1.0+)

#### @mastra/pg `^1.0.0`
**Purpose**: PostgreSQL adapter
**Why**: Store conversations, embeddings in Supabase

### Vercel AI SDK `^5.0.114` (ai npm package)
**Purpose**: AI Gateway integration, streaming
**Why**: Unified interface for multiple AI providers
**Features**:
- Model routing (`anthropic/...`, `google/...`, `openai/...`)
- Streaming responses
- Tool calling
- Image generation

### AI Providers

#### @ai-sdk/anthropic `^2.0.56`
**Purpose**: Claude API
**Models**: `claude-sonnet-4-5`, `claude-opus-4-6`
**Why**: Best reasoning, long context, tool use

#### @ai-sdk/google `^2.0.49`
**Purpose**: Gemini API
**Models**: `gemini-2.5-flash`, `gemini-2.5-pro`
**Why**: 1M token context for Observer/Reflector, cheap

#### @ai-sdk/openai `^3.0.2`
**Purpose**: OpenAI API
**Models**: `text-embedding-3-small`
**Why**: Best embeddings for semantic search

#### @ai-sdk/gateway `^2.0.22`
**Purpose**: Vercel AI Gateway
**Why**: Caching, rate limiting, cost tracking, observability

**Configuration**:
```typescript
import { createGateway } from '@ai-sdk/gateway';
const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
const model = gateway('anthropic/claude-sonnet-4-5');
```

---

## State Management

### Zustand `^5.x`
**Purpose**: Client-side state management
**Why**: Simple API, less boilerplate than Redux, good DX
**Key Features**:
- Persist middleware (localStorage)
- Immer middleware (immutable updates)
- DevTools integration

**Usage**:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
    }),
    { name: 'gear-store' }
  )
);
```

**When to use**: Client-side ephemeral state only. Supabase is source of truth.

---

## Forms & Validation

### react-hook-form `^7.68.0`
**Purpose**: Form state management
**Why**: Performance (uncontrolled), minimal re-renders, great DX
**Key Features**:
- Uncontrolled components (better performance)
- Validation on blur/change/submit
- TypeScript support
- Integration with Zod

### Zod `^4.1.13`
**Purpose**: Schema validation
**Why**: Type-safe, composable, great error messages
**Usage**:
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  weight: z.number().positive(),
});

type FormData = z.infer<typeof schema>;
```

### @hookform/resolvers `^5.2.2`
**Purpose**: Zod integration for react-hook-form
**Usage**:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
const form = useForm({ resolver: zodResolver(schema) });
```

---

## Internationalization (i18n)

### next-intl `^4.5.8`
**Purpose**: i18n for Next.js App Router
**Why**: Server Component support, type-safe, locale routing
**Languages**: English (`en`), German (`de`)

**Key Features**:
- URL-based locale routing (`/en/...`, `/de/...`)
- Server Component translations
- Type-safe translation keys
- Pluralization, date/number formatting

**Configuration**:
```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default,
}));
```

**Usage**:
```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('Namespace');
return <p>{t('key')}</p>;
```

---

## Media & Assets

### Cloudinary
**Purpose**: Image CDN, transformations, storage
**Why**: Automatic optimization, responsive images, background removal integration

#### cloudinary `^2.8.0`
**Purpose**: Server-side SDK
**Usage**: Upload images, generate signed URLs

#### next-cloudinary `^6.17.5`
**Purpose**: Next.js integration
**Features**:
- `<CldImage>` component (auto-optimization)
- Upload widget
- Video player

**Configuration**:
```typescript
import { Cloudinary } from '@cloudinary/url-gen';
const cld = new Cloudinary({
  cloud: { cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME },
});
```

### @imgly/background-removal `^1.7.0`
**Purpose**: Client-side background removal (WASM)
**Why**: No server needed, fast, good quality
**Key Features**:
- Runs in browser (WebAssembly)
- ~45MB model download (cached)
- Output: PNG with transparency

**Usage**:
```typescript
import { removeBackground } from '@imgly/background-removal';
const blob = await removeBackground(imageFile);
```

---

## Data Visualization

### Recharts `^3.5.1`
**Purpose**: Chart library
**Why**: Composable, responsive, good defaults
**Charts Used**:
- Donut Chart (weight distribution)
- Bar Chart (cost breakdown)
- Area Chart (weight over time)

**Usage**:
```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
```

---

## Developer Tools

### ESLint `^9.x`
**Purpose**: Linting
**Rules**:
- `@next/eslint-plugin-next` (Next.js best practices)
- TypeScript strict rules
- No `any` types
- Import order

### Vitest `^3.x`
**Purpose**: Unit testing
**Why**: Fast, Vite-powered, Jest-compatible API
**Scripts**:
```bash
npm test          # Run tests
npm run test:ui   # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### tsx
**Purpose**: Run TypeScript scripts directly
**Usage**:
```bash
tsx scripts/seed-ontology.ts
```

---

## Monitoring & Observability

### Sentry `^10.31.0` (@sentry/nextjs)
**Purpose**: Error tracking, performance monitoring
**Features**:
- Client-side error tracking
- Server-side error tracking
- Edge function errors
- User feedback widget
- Source maps upload

**Configuration**:
- `sentry.client.config.ts` - Browser
- `sentry.server.config.ts` - Node.js
- `sentry.edge.config.ts` - Edge Functions

### Vercel Analytics `^1.6.1`
**Purpose**: Web Vitals tracking
**Metrics**: CLS, FID, LCP, FCP, TTFB, INP

### Vercel Speed Insights `^1.3.1`
**Purpose**: Real User Monitoring (RUM)
**Features**: Route-level performance, A/B testing insights

### OpenTelemetry
**Purpose**: Distributed tracing
**Packages**:
- `@opentelemetry/sdk-node` - Node.js SDK
- `@opentelemetry/auto-instrumentations-node` - Auto-instrumentation
- `@opentelemetry/instrumentation-pg` - PostgreSQL tracing
- `@opentelemetry/exporter-*-otlp-http` - OTLP exporters

**Configuration**:
```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';
registerOTel({ serviceName: 'gearshack-winterberry' });
```

---

## Utilities & Helpers

### date-fns `^4.1.0`
**Purpose**: Date manipulation
**Why**: Tree-shakeable, immutable, i18n support
**Usage**:
```typescript
import { format, addDays, differenceInDays } from 'date-fns';
format(new Date(), 'yyyy-MM-dd');
```

### clsx `^2.1.1` + tailwind-merge `^3.4.0`
**Purpose**: Conditional class merging
**Combined as `cn()` utility**:
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

**Usage**:
```tsx
<div className={cn('base-class', isActive && 'active-class', className)} />
```

### geolib `^3.3.4`
**Purpose**: Geospatial calculations
**Why**: Distance between coordinates, bounding boxes
**Usage**:
```typescript
import { getDistance } from 'geolib';
const distance = getDistance(
  { latitude: 51.5, longitude: 0.12 },
  { latitude: 48.8, longitude: 2.3 }
);
```

### mathjs `^15.1.0`
**Purpose**: Advanced math operations
**Usage**: Unit conversions, statistical calculations

---

## External APIs & Services

### Serper.dev (serpapi `^2.2.1`)
**Purpose**: Google Search API for product image search
**Why**: Affordable, fast, good image results
**Usage**:
```typescript
import { getJson } from 'serpapi';
const results = await getJson({
  engine: 'google_images',
  q: 'Arc\'teryx Alpha SV jacket',
  api_key: process.env.SERPER_API_KEY,
});
```

### Google Maps (@react-google-maps/api `^2.20.7`)
**Purpose**: Map display for merchant locations
**Why**: Official React bindings, type-safe
**Usage**:
```tsx
import { GoogleMap, Marker } from '@react-google-maps/api';
```

---

## Build & Deploy

### Vercel
**Purpose**: Hosting, edge network, serverless functions
**Why**: Made for Next.js, zero-config, global CDN
**Features**:
- Edge Functions (for latency-sensitive ops)
- Serverless Functions (API routes)
- Automatic preview deployments (PR)
- Environment variables per environment

### Turbopack (Optional)
**Purpose**: Next-gen bundler (faster than Webpack)
**Status**: Experimental (not used in production builds)
**Usage**: `npm run build:turbo`

---

## Package Management

### npm `>=11.9.0`
**Purpose**: Package manager
**Why**: Comes with Node.js, reliable
**Lockfile**: `package-lock.json` (committed)

---

## Environment Variables

All environment variables are documented in `.env.example`.

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...  # For Mastra

# AI Gateway
AI_GATEWAY_API_KEY=...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Sentry
NEXT_PUBLIC_SENTRY_DSN=...
```

### Optional

```bash
# AI Models (defaults to Claude Sonnet 4.5)
AI_CHAT_MODEL=anthropic/claude-sonnet-4-5
OM_MODEL=google/gemini-2.5-flash

# Mastra Memory
MASTRA_MEMORY_LAST_MESSAGES=20
OBSERVATIONAL_MEMORY_ENABLED=true
OM_MESSAGE_TOKENS=20000

# Feature Flags
WORKING_MEMORY_ENABLED=true
AI_GENERATION_ENABLED=true
```

---

## Version Strategy

### Major Dependencies (Pinned)
- React: Exact version `19.2.0` (major changes, test thoroughly)
- Next.js: Caret `^16.1.1` (patch updates safe)
- TypeScript: Caret `^5.x` (minor updates safe)

### Utility Libraries (Flexible)
- Lodash, date-fns, etc.: Caret `^` (safe to update)

### AI/ML Libraries (Conservative)
- Mastra, AI SDK: Exact or caret (breaking changes common)
- Test after every update

### Update Policy
```bash
# Check outdated packages
npm outdated

# Update minor/patch (safe)
npm update

# Update major (test thoroughly)
npm install package@latest
```

---

## Dependency Graph

```
Next.js 16
├── React 19
├── Tailwind CSS 4
├── shadcn/ui (Radix UI primitives)
└── TypeScript 5

Supabase
├── PostgreSQL 15
│   ├── pgvector (embeddings)
│   ├── pg_trgm (fuzzy search)
│   └── PostGIS (geospatial)
├── @supabase/supabase-js (client)
└── @supabase/ssr (SSR support)

Mastra Agent
├── @mastra/core (agent framework)
├── @mastra/memory (four-tier memory)
├── @mastra/pg (PostgreSQL adapter)
├── Vercel AI SDK (model routing)
│   ├── @ai-sdk/anthropic (Claude)
│   ├── @ai-sdk/google (Gemini)
│   └── @ai-sdk/openai (embeddings)
└── OpenTelemetry (tracing)

Forms & Validation
├── react-hook-form (form state)
├── Zod (validation)
└── @hookform/resolvers (integration)

State Management
└── Zustand (client state)

Styling
├── Tailwind CSS 4
├── shadcn/ui components
├── next-themes (theme switching)
└── lucide-react (icons)

Media
├── Cloudinary (CDN)
├── next-cloudinary (Next.js integration)
└── @imgly/background-removal (WASM)

i18n
└── next-intl (Next.js App Router i18n)

Charts
└── Recharts (data visualization)

Monitoring
├── Sentry (errors)
├── Vercel Analytics (web vitals)
├── Vercel Speed Insights (RUM)
└── OpenTelemetry (tracing)
```

---

## Related Docs

- [System Architecture](overview.md)
- [Database Schema](database-schema.md)
- [Development Setup](../guides/development-setup.md)

---

**Last Updated**: 2026-02-06
**Node Version**: 22.13.0+
**Total Dependencies**: 100+
