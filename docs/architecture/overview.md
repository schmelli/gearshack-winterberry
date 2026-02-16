# System Architecture Overview

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (new-york style, zinc color)
- **State Management**: Zustand (with persist middleware)
- **Forms**: react-hook-form + Zod validation
- **i18n**: next-intl (English + German)

### Backend
- **Database**: Supabase PostgreSQL with pgvector
- **Auth**: Supabase Auth (Google OAuth, Email/Password)
- **Storage**: Cloudinary (images) + Supabase Storage (backups)
- **API**: Next.js API Routes (App Router)

### AI & Agent
- **Agent Framework**: Mastra v1.0+
- **Models**: Anthropic Claude (Sonnet 4.5) via Vercel AI Gateway
- **Memory**: Four-tier system (Working, History, Semantic Recall, Observational)
- **Vector Store**: pgvector (HNSW index, dotproduct metric)
- **Embeddings**: OpenAI text-embedding-3-small

### DevOps
- **Hosting**: Vercel (Edge Network)
- **Analytics**: Vercel Analytics + Speed Insights
- **Monitoring**: Sentry (error tracking, user feedback)
- **Observability**: OpenTelemetry + Mastra Tracing

## Architecture Principles

### Feature-Sliced Light
- **Business Logic**: Lives in custom hooks (`hooks/`)
- **UI Components**: Stateless, receive data via props only
- **Types**: All data models in `types/`
- **No `useEffect` in components** - keep them pure

### Import Alias
All imports use `@/*` for absolute paths (configured in `tsconfig.json`).

### Three-Layer Architecture
1. **Presentation Layer**: `app/`, `components/`
2. **Business Logic Layer**: `hooks/`, `lib/`
3. **Data Layer**: Supabase client, API routes

## Directory Structure

```
gearshack-winterberry/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Internationalized routes
│   │   ├── inventory/     # Gear inventory pages
│   │   ├── loadouts/      # Pack management
│   │   ├── community/     # Social features
│   │   └── settings/      # User settings
│   └── api/               # API routes
│       ├── mastra/        # AI assistant endpoints
│       ├── loadout-images/# AI image generation
│       └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── layout/           # Header, Footer, Shell
│   ├── inventory-gallery/# Inventory UI
│   └── ...
├── hooks/                # Custom React hooks (business logic)
│   ├── useSupabaseStore.ts # Global state + Supabase sync
│   ├── useLoadouts.ts    # Loadout management
│   └── ...
├── lib/                  # Utilities and services
│   ├── supabase/         # Supabase client + services
│   ├── mastra/           # Mastra agent configuration
│   ├── vercel-ai.ts      # AI Gateway setup
│   └── ...
├── types/                # TypeScript type definitions
├── messages/             # i18n translations (en.json, de.json)
├── public/               # Static assets
├── specs/                # Feature specifications
└── docs/                 # This documentation wiki
```

## Data Flow

### User Interaction Flow
```
User Action
  ↓
Component (UI)
  ↓
Custom Hook (Business Logic)
  ↓
Supabase Client / API Route
  ↓
PostgreSQL Database
  ↓
Real-time subscription (if applicable)
  ↓
Zustand Store Update
  ↓
Component Re-render
```

### AI Assistant Flow

> **UI Layer**: Persistent side panel (desktop) / bottom sheet (mobile). See [AI Assistant Side Panel](../features/ai-assistant-side-panel.md).

```
User Message
  ↓
/api/mastra/chat
  ↓
Mastra Agent
  ├─ Four-Tier Memory
  │  ├─ Working Memory (User Profile)
  │  ├─ Message History (Last 20)
  │  ├─ Semantic Recall (Vector Search)
  │  └─ Observational Memory (Compressed Context)
  └─ Tools
     ├─ queryUserData (SQL queries)
     ├─ queryCatalog (Product search)
     ├─ queryGearGraph (Analytics)
     └─ searchWeb (External search)
  ↓
Stream Response to Client
```

## Key Design Decisions

### 1. Supabase over Firebase
**Why**: Better SQL support, pgvector for AI, self-hostable
**Trade-offs**: Migration complexity, learning curve
**See**: [ADR-001](../decisions/adr-001-supabase-migration.md)

### 2. Observational Memory
**Why**: Tool-heavy conversations need compression, cost optimization
**Trade-offs**: Additional background agents, complexity
**See**: [ADR-002](../decisions/adr-002-observational-memory.md)

### 3. Feature-Sliced Light
**Why**: Separation of concerns, testability, reusability
**Trade-offs**: More files, requires discipline
**See**: [ADR-003](../decisions/adr-003-feature-sliced-light.md)

### 4. Cloudinary for Images
**Why**: CDN, transformations, background removal integration
**Trade-offs**: Cost, vendor lock-in
**Migration Path**: Images stored by URL, easy to migrate

### 5. Zustand over Redux
**Why**: Simpler API, less boilerplate, better DX
**Trade-offs**: Less tooling, no time-travel debugging
**When to use**: Client-side state only (Supabase is source of truth)

## Performance Considerations

### Bundle Size
- Lazy-load heavy components (modals, charts)
- Dynamic imports for routes
- Tree-shaking via ESM

### Database Queries
- RLS policies on all tables
- Indexed columns for common queries
- Batch operations where possible
- Use `select` to minimize data transfer

### Memory Management
- Observational Memory: 5-40× compression
- Semantic Recall: Top-K limiting (default: 5)
- Message History: Last 20 messages only
- Working Memory: Small JSON (< 5KB)

### Caching
- Next.js: Static generation where possible
- Vercel: Edge caching
- Supabase: Connection pooling
- AI Gateway: Prompt caching with OM

## Security

### Authentication
- Supabase Auth with Google OAuth
- Email/password with magic links
- Row-Level Security (RLS) on all tables

### API Security
- Server-side validation (Zod schemas)
- Rate limiting on AI endpoints
- User ID from session, never from client

### Data Privacy
- GDPR-compliant data retention (90 days default)
- User can delete all data
- No PII in AI logs (masked)

## Monitoring & Observability

### Error Tracking
- **Sentry**: Client + Server + Edge
- **User Feedback**: Sentry form integration
- **Source Maps**: Uploaded to Sentry

### Performance
- **Vercel Analytics**: Web Vitals
- **Speed Insights**: Real User Monitoring
- **Lighthouse**: CI checks

### AI Observability
- **Mastra Tracing**: OpenTelemetry integration
- **Mastra Studio**: Memory visualization
- **Token Usage**: Tracked per request
- **Cost Attribution**: Per-user metrics

## Deployment

### Environments
- **Development**: `localhost:3000` + Supabase local
- **Preview**: Vercel preview deployments (PR)
- **Production**: `gearshack.app` + Supabase cloud

### CI/CD Pipeline
```
git push → development
  ↓
Vercel Preview Deploy
  ↓
TypeScript Check
ESLint Check
Build Success
  ↓
Manual Review
  ↓
Merge to main → Production Deploy
```

## Related Docs

- [Database Schema](database-schema.md)
- [Tech Stack Details](tech-stack.md)
- [Feature-Sliced Light](../decisions/adr-003-feature-sliced-light.md)

---

**Last Updated**: 2026-02-06
