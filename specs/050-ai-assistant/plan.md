# Implementation Plan: GearShack AI Assistant

**Branch**: `050-ai-assistant` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/050-ai-assistant/spec.md`

## Summary

Implement an intelligent chat assistant exclusively for Trailblazer users, accessible via a modal in the app's title bar. The AI provides context-aware responses about gear specifications, recommendations, inventory analysis, and community discovery. It executes actions directly in the system (wishlist management, messaging, navigation) and responds in the user's selected language. The system includes full multi-session synchronization, comprehensive observability, graceful degradation, and strict rate limiting (30 messages/hour per user).

**Technical Approach**:
- Next.js 16+ App Router with Server Components for AI backend integration
- Vercel AI SDK for conversational AI capabilities
- Supabase PostgreSQL for conversation persistence (90-day retention), real-time subscriptions for multi-session sync
- Zustand for client-side state management with optimistic updates
- shadcn/ui Dialog component for chat modal, stateless UI components
- Custom hooks pattern for all business logic (conversation management, AI queries, action execution)
- OpenTelemetry for distributed tracing, structured logging, and metrics collection

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- Next.js 16+ with App Router
- React 19+
- Vercel AI SDK (conversational AI)
- Supabase client (@supabase/supabase-js, @supabase/ssr)
- Zustand (state management with persist middleware)
- shadcn/ui (Dialog, Button, Card components)
- next-intl (i18n)
- OpenTelemetry SDK (observability)

**Storage**:
- PostgreSQL (Supabase) for conversation history, messages, context snapshots
- Supabase Realtime for multi-session synchronization
- Browser localStorage via Zustand persist (offline message queue)

**Testing**:
- Vitest for unit tests (hooks, utility functions)
- React Testing Library for component tests
- Playwright for E2E tests (conversation flows, multi-session sync)

**Target Platform**: Web (Next.js server-side + client-side React)

**Performance Goals**:
- 95% of AI responses delivered in under 3 seconds (SC-012)
- 95% of cross-session sync events propagate within 2 seconds (SC-015)
- 99.5% AI backend availability (SC-016)
- P95 latency <3s normal, P99 <5s peak (SC-017, SC-018)

**Constraints**:
- Trailblazer-exclusive feature (subscription tier enforcement)
- 30 messages per hour per user rate limit
- 90-day conversation retention (automatic purge)
- <2 second sync latency for multi-session updates
- WCAG AA compliance for chat UI
- Graceful degradation when AI backend unavailable

**Scale/Scope**:
- 1000-5000 Trailblazer users initially
- Estimated 3-10 messages per session (SC-003 target: 3+)
- Up to 90 days of conversation history per user
- Multi-session sync across unlimited tabs/devices per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Feature-Sliced Light Architecture ✅ COMPLIANT

- **UI Components**: Chat modal, message bubbles, inline cards, action buttons will be stateless React components receiving data via props
- **Custom Hooks**: All business logic in dedicated hooks:
  - `useAIChat.ts` - Conversation management, AI query execution
  - `useConversationSync.ts` - Multi-session synchronization via Supabase Realtime
  - `useRateLimiting.ts` - 30 msg/hr enforcement
  - `useChatActions.ts` - Wishlist, messaging, navigation actions
  - `useConversationHistory.ts` - Message persistence, 90-day retention
- **Types**: All data models in `@/types`:
  - `Conversation`, `Message`, `Context`, `Action`, `GearAlternative`, `CommunityOffer`, `InlineCard`

**Compliance Strategy**: No `useEffect` or complex logic in component files. All state management, data fetching, and side effects isolated in custom hooks.

### Principle II: TypeScript Strict Mode ✅ COMPLIANT

- Strict mode enabled, no `any` types
- AI response types validated with Zod schemas before rendering
- User profile data (locale, trips) typed via Supabase generated types
- Generic types for reusable components (e.g., `InlineCard<T>`)

### Principle III: Design System Compliance ✅ COMPLIANT

- `Dialog` component from shadcn/ui for chat modal
- `Button` for action buttons (Add to Wishlist, Compare, Send Message)
- `Card` for inline gear preview cards
- `ScrollArea` for conversation history
- All styling via Tailwind CSS classes (no separate CSS files)
- Responsive design with Tailwind breakpoints

### Principle IV: Spec-Driven Development ✅ COMPLIANT

- Feature spec exists at `/specs/050-ai-assistant/spec.md` with 8 user stories, 48 functional requirements, 21 success criteria
- Implementation follows this plan workflow:
  1. Phase 0: Research AI integration patterns, Supabase Realtime sync strategy
  2. Phase 1: Define data model (Conversation, Message entities), API contracts (Server Actions for AI queries)
  3. Phase 2: Create types → hooks → components

**State Management Pattern**:
- Zustand for global conversation state with optimistic updates (add message immediately, rollback on AI error)
- State machine for AI query status: `idle → loading → success | error | degraded`
- Supabase Realtime subscriptions for cross-session sync

### Principle V: Import and File Organization ✅ COMPLIANT

- All imports use `@/*` path alias
- Feature-based organization:
  ```
  app/[locale]/ai-assistant/           # AI chat routes
  components/ai-assistant/             # Chat modal, messages, inline cards
  hooks/ai-assistant/                  # Business logic hooks
  types/ai-assistant.ts                # AI-specific types
  ```

### Technology Constraints Check ✅ COMPLIANT

| Constraint | Compliance | Notes |
|------------|-----------|-------|
| Next.js 16+ App Router | ✅ | Server Actions for AI queries, Server Components for context injection |
| TypeScript 5.x strict | ✅ | Strict mode enabled, no `any` types |
| React 19+ | ✅ | Using React 19 features (Server Components, Actions) |
| Tailwind CSS 4 | ✅ | All styling via Tailwind classes |
| shadcn/ui | ✅ | Dialog, Button, Card, ScrollArea components |
| lucide-react | ✅ | Icons for AI icon, action buttons |
| react-hook-form + zod | ⚠️ NOT USED | Chat uses direct text input, not forms |
| Supabase PostgreSQL | ✅ | Conversation persistence, Realtime sync |
| Cloudinary | ⚠️ NOT USED | Gear images already in Cloudinary (referenced, not uploaded) |
| Vercel AI SDK | ✅ | **NEW DEPENDENCY** - Core AI conversational capability |
| next-intl | ✅ | AI responses in user's selected language |
| Zustand | ✅ | Conversation state, optimistic updates |
| Sonner | ✅ | Error toasts for rate limit, AI failures |

**New Dependencies Required**:
- **Vercel AI SDK** (`ai` npm package): Provides conversational AI capabilities, streaming responses, context management
  - Justification: Mandatory for AI chat functionality. No built-in Next.js alternative for conversational AI.
- **OpenTelemetry SDK** (`@opentelemetry/sdk-node`, `@opentelemetry/api`): Distributed tracing, metrics collection
  - Justification: Required by FR-045 (distributed tracing), FR-041-044 (metrics). Industry standard for observability.

### Constitution Compliance Summary

**Overall Status**: ✅ **COMPLIANT** (2 minor deviations justified)

**Deviations**:
1. **react-hook-form not used**: Chat input is simple text field, not a complex form. Direct `<input>` with `onChange` is simpler and more appropriate.
2. **Cloudinary not actively used**: Feature reads existing gear images from Cloudinary but doesn't upload new images. Read-only usage via existing URLs.

**Justification**: Both deviations align with constitution principle of "Prefer built-in Next.js features over third-party alternatives" - using native input element instead of form library, and reusing existing Cloudinary URLs without additional integration.

## Project Structure

### Documentation (this feature)

```text
specs/050-ai-assistant/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (AI integration patterns, Realtime sync strategy)
├── data-model.md        # Phase 1 output (Conversation, Message, Context entities)
├── quickstart.md        # Phase 1 output (Local dev setup, AI API keys, Supabase config)
├── contracts/           # Phase 1 output (Server Actions contracts, Realtime event schemas)
│   ├── ai-query.md      # Server Action: sendAIMessage(message, context)
│   ├── actions.md       # Server Actions: addToWishlist, sendMessage, compare
│   └── realtime.md      # Supabase Realtime event schemas for sync
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/[locale]/
├── ai-assistant/
│   └── actions.ts                    # Server Actions for AI queries, actions

components/ai-assistant/
├── AIAssistantButton.tsx             # Title bar icon with Trailblazer badge
├── AIAssistantModal.tsx              # Dialog wrapper (stateless)
├── ChatInterface.tsx                 # Main chat UI (stateless)
├── MessageList.tsx                   # Conversation history display
├── MessageBubble.tsx                 # Individual message component
├── InlineGearCard.tsx                # Gear preview cards in AI responses
├── ActionButtons.tsx                 # Add to Wishlist, Compare, Send Message buttons
├── UpgradeModal.tsx                  # Standard user upgrade flow
└── ChatInput.tsx                     # Message input field with rate limit display

hooks/ai-assistant/
├── useAIChat.ts                      # Core conversation logic, AI queries
├── useConversationSync.ts            # Supabase Realtime multi-session sync
├── useRateLimiting.ts                # 30 msg/hr enforcement, countdown
├── useChatActions.ts                 # Wishlist, messaging, navigation actions
├── useConversationHistory.ts         # Message persistence, 90-day retention
├── useContextDetection.ts            # Current screen detection, context building
└── useAICacheFallback.ts             # Graceful degradation, cached responses

types/
└── ai-assistant.ts                   # Conversation, Message, Context, Action types

lib/ai-assistant/
├── ai-client.ts                      # Vercel AI SDK initialization
├── prompt-builder.ts                 # Context-aware prompt construction
├── response-parser.ts                # AI response parsing, inline card extraction
├── cache-strategy.ts                 # Common query caching (base weight, gear specs)
├── sync-protocol.ts                  # Realtime event handlers
└── observability.ts                  # OpenTelemetry setup, metrics, tracing

Database (Supabase migrations):
supabase/migrations/
└── 050_ai_assistant.sql              # conversations, messages, rate_limits tables

Tests:
tests/ai-assistant/
├── unit/
│   ├── useAIChat.test.ts             # Hook unit tests
│   ├── useRateLimiting.test.ts       # Rate limit logic tests
│   └── response-parser.test.ts       # AI response parsing tests
├── integration/
│   ├── conversation-sync.test.ts     # Multi-session sync tests
│   └── ai-backend.test.ts            # AI query integration tests
└── e2e/
    ├── chat-flow.spec.ts             # Full conversation E2E
    ├── multi-session.spec.ts         # Cross-tab sync E2E
    └── rate-limiting.spec.ts         # 30 msg/hr enforcement E2E
```

**Structure Decision**: Web application structure using Next.js App Router. All AI assistant code is feature-sliced under `ai-assistant/` subdirectories. Server Actions in `app/[locale]/ai-assistant/actions.ts` handle AI queries and system actions. Client-side hooks manage state, sync, and rate limiting. Components are stateless presentational layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ No constitutional violations requiring justification.

Minor deviations (react-hook-form not used, Cloudinary read-only) are documented in Constitution Check section and align with constitution's principle of preferring built-in solutions over third-party libraries.
