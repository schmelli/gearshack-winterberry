# Implementation Plan: Mastra Agentic Voice AI

**Branch**: `001-mastra-agentic-voice` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-mastra-agentic-voice/spec.md`

## Summary

Re-platform the existing stateless AI chatbot (Vercel AI SDK + Anthropic Claude) to a stateful, agentic system using Mastra Framework. This migration enables persistent conversation memory across sessions, multi-step workflow orchestration for complex trip planning, MCP integration with GearGraph for graph-based gear intelligence, and voice interaction capabilities (speech-to-text + text-to-speech) with sub-3-second latency. The system will maintain backwards compatibility with the existing frontend while adding comprehensive observability (structured logging, Prometheus metrics, distributed tracing), tiered rate limiting (unlimited simple queries, 20 workflows/hour, 40 voice/hour), and GDPR compliance with user data deletion rights. Target scale: 25 concurrent users, 250 DAU.

**Technical Approach**: Embed Mastra Framework within Next.js 16 App Router, use Supabase PostgreSQL as memory backend via custom `@mastra/memory` adapter, connect to GearGraph MCP server for dynamic tool discovery, orchestrate parallel workflow steps (weather API + inventory queries), implement voice pipeline with Whisper transcription + ElevenLabs/OpenAI TTS, instrument with OpenTelemetry for distributed tracing, export Prometheus metrics, and enforce tiered rate limiting at API route level.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode - no `any` types allowed)
**Primary Framework**: Next.js 16.0.7 with App Router + React 19.2.0
**New Dependencies**:
- `mastra` - Agentic AI orchestration framework
- `@mastra/memory` - Memory persistence adapters (Supabase backend)
- `@modelcontextprotocol/sdk` - MCP client for GearGraph integration
- `prom-client` - Prometheus metrics exporter
**Existing Dependencies**:
- `ai@5.0.114` (Vercel AI SDK) - AI Gateway + streaming
- `@supabase/supabase-js@2.87.1` - Database + auth
- `zod@4.1.13` - Runtime validation
- `zustand@5.0.9` - Client-side state management
- `@opentelemetry/sdk-node@0.208.0` - Distributed tracing (already installed)
**Storage**: Supabase PostgreSQL (existing database + 4 new tables: `conversation_memory`, `workflow_executions`, `rate_limit_tracking`, `gdpr_deletion_records`)
**Testing**: Vitest 4.x (existing), manual QA for voice interactions
**Target Platform**: Next.js Edge Runtime for API routes (or Node.js runtime if Mastra incompatible with Edge)
**Project Type**: Web application (Next.js monorepo with App Router)
**Performance Goals**:
- Voice end-to-end latency: <3s (P90), <5s (P99)
- Workflow completion: <10s (P90)
- Memory retrieval: <200ms (P95)
**Constraints**:
- MUST maintain backwards compatibility with existing `useChat` frontend hook
- MUST preserve Trailblazer subscription tier requirement
- MUST keep SSE streaming format for UI real-time updates
- MUST comply with GDPR (data deletion within 24 hours)
**Scale/Scope**: MVP scale - 25 concurrent users, 250 daily active users, single-instance deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Feature-Sliced Light Architecture ✅ PASS

**Compliance**:
- UI Components (stateless, props-only):
  - `components/ai-assistant/VoiceInputButton.tsx`
  - `components/ai-assistant/VoiceRecordingIndicator.tsx`
  - `components/ai-assistant/AudioPlaybackControls.tsx`
  - `components/ai-assistant/WorkflowProgressIndicator.tsx`
- Custom Hooks (all business logic):
  - `hooks/ai-assistant/useMastraChat.ts` - Chat state machine
  - `hooks/ai-assistant/useVoiceInput.ts` - Audio capture + transcription
  - `hooks/ai-assistant/useVoiceOutput.ts` - TTS synthesis + playback
- Services (external integrations):
  - `lib/mastra/agent.ts` - Mastra agent initialization
  - `lib/mastra/memory-adapter.ts` - Supabase memory backend
  - `lib/mastra/workflows/trip-planner.ts` - Trip planning orchestration
  - `lib/mastra/mcp-client.ts` - GearGraph MCP connection
- Types (data models):
  - `types/mastra.ts` - Memory records, workflow definitions, tool results

**No Violations**: All business logic isolated from UI components. State machines in custom hooks.

### II. TypeScript Strict Mode ✅ PASS

**Compliance**:
- Mastra agent config: Strongly typed with Zod schemas
- Memory records: Explicit interfaces in `types/mastra.ts`
- Workflow parameters: Zod validation before execution
- Tool results: Explicit return types (e.g., `QueryUserDataResponse`, `WorkflowProgressUpdate`)
- External data (transcription, TTS): Validated with Zod before use

**No `any` Types**: Generic types used for flexible tool parameters.

### III. Design System Compliance ✅ PASS

**Compliance**:
- Voice input button → `Button` from shadcn/ui (mic icon from lucide-react)
- Recording indicator → Custom animation using Tailwind CSS (no new components)
- Workflow progress → `Progress` component from shadcn/ui
- Memory settings dialog → `Dialog` component from shadcn/ui
- Styling → Tailwind CSS classes only (no new CSS files)

**No New Base Components**: Reuses existing shadcn/ui library.

### IV. Spec-Driven Development ✅ PASS

**Compliance**:
1. ✅ Spec exists: `/specs/001-mastra-agentic-voice/spec.md`
2. ✅ Types first: `types/mastra.ts` created in Phase 2.1
3. ✅ Hooks second: `hooks/ai-assistant/useMastraChat.ts` in Phase 2.3
4. ✅ UI last: `components/ai-assistant/VoiceInputButton.tsx` in Phase 5.3

**State Management Pattern**:
- Complex async flows → State machine (idle → recording → transcribing → processing → streaming → success/error)
- Global state → Zustand with persist middleware (voice settings: enabled, language preference)
- Optimistic updates → Rollback on errors (memory corrections)

### V. Import and File Organization ✅ PASS

**Compliance**:
- All imports use `@/*` absolute paths (NO `../../` relative imports)
- Files organized by feature:
  - `lib/mastra/` - Agent, memory, workflows, MCP
  - `hooks/ai-assistant/` - Chat, voice input/output hooks
  - `types/mastra.ts` - Mastra-specific types
- Co-located feature files: Workflows in `lib/mastra/workflows/trip-planner.ts`

**No Violations**: Follows feature-first organization.

## Project Structure

### Documentation (this feature)

```text
specs/001-mastra-agentic-voice/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Mastra integration patterns
├── data-model.md        # Phase 1 output - Memory schemas, workflow definitions
├── quickstart.md        # Phase 1 output - Local development setup
├── contracts/           # Phase 1 output - API route contracts
│   ├── api-mastra-chat.md
│   ├── api-mastra-memory-delete.md
│   ├── api-mastra-voice-transcribe.md
│   ├── api-mastra-voice-synthesize.md
│   └── api-mastra-metrics.md
├── spec.md              # Feature specification (already exists)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── api/
│   └── mastra/
│       ├── chat/
│       │   └── route.ts              # NEW: Streaming chat with memory (replaces /api/ai-assistant/stream)
│       ├── memory/
│       │   └── delete/
│       │       └── route.ts          # NEW: GDPR data deletion endpoint
│       ├── voice/
│       │   ├── transcribe/
│       │   │   └── route.ts          # NEW: Whisper transcription endpoint
│       │   └── synthesize/
│       │       └── route.ts          # NEW: TTS synthesis endpoint
│       └── metrics/
│           └── route.ts              # NEW: Prometheus metrics endpoint

components/
└── ai-assistant/
    ├── VoiceInputButton.tsx          # NEW: Mic button for voice input
    ├── VoiceRecordingIndicator.tsx   # NEW: Pulsing animation during recording
    ├── AudioPlaybackControls.tsx     # NEW: Pause/stop controls for TTS
    └── WorkflowProgressIndicator.tsx # NEW: Shows workflow step progress

hooks/
└── ai-assistant/
    ├── useMastraChat.ts              # NEW: Chat state machine with memory
    ├── useVoiceInput.ts              # NEW: Audio capture + transcription logic
    └── useVoiceOutput.ts             # NEW: TTS synthesis + playback logic

lib/
├── mastra/
│   ├── agent.ts                      # NEW: Mastra agent initialization
│   ├── config.ts                     # NEW: Agent configuration (model, prompts)
│   ├── memory-adapter.ts             # NEW: Supabase memory backend adapter
│   ├── auth-adapter.ts               # NEW: Supabase auth integration
│   ├── streaming.ts                  # NEW: SSE streaming helpers
│   ├── mcp-client.ts                 # NEW: GearGraph MCP connection
│   ├── mcp-tools.ts                  # NEW: Dynamic MCP tool wrappers
│   ├── rate-limiter.ts               # NEW: Tiered rate limiting logic
│   ├── gdpr.ts                       # NEW: Data deletion + sanitization
│   ├── logging.ts                    # NEW: Structured JSON logging
│   ├── log-sanitizer.ts              # NEW: PII removal from logs
│   ├── metrics.ts                    # NEW: Prometheus metric collectors
│   ├── tracing.ts                    # NEW: OpenTelemetry span instrumentation
│   ├── workflows/
│   │   ├── base.ts                   # NEW: Workflow execution framework
│   │   └── trip-planner.ts           # NEW: Trip planning workflow (5 steps)
│   ├── tools/
│   │   ├── query-user-data.ts        # MIGRATED: From lib/ai-assistant/tools/
│   │   ├── search-catalog.ts         # MIGRATED: From lib/ai-assistant/tools/
│   │   ├── search-web.ts             # MIGRATED: From lib/ai-assistant/tools/
│   │   └── mcp-graph.ts              # NEW: MCP graph traversal tools
│   └── voice/
│       ├── whisper.ts                # NEW: Whisper API integration
│       └── tts.ts                    # NEW: ElevenLabs/OpenAI TTS integration
├── external-apis/
│   └── weather.ts                    # NEW: Weather API for trip planning
└── ai-assistant/                     # EXISTING: Keep for backwards compatibility during migration
    ├── ai-client.ts                  # EXISTING: Deprecated post-migration
    ├── prompt-builder.ts             # EXISTING: Migrate to lib/mastra/config.ts
    └── tools/                        # EXISTING: Deprecated post-migration

types/
└── mastra.ts                         # NEW: Mastra-specific types
    # - ConversationMemory
    # - WorkflowExecution
    # - ToolResult
    # - VoiceTranscriptionResult
    # - TTSSynthesisResult
    # - RateLimitRecord
    # - GDPRDeletionRecord

supabase/
└── migrations/
    ├── 20250120_conversation_memory.sql     # NEW: Conversation memory table
    ├── 20250122_workflow_executions.sql     # NEW: Workflow execution tracking
    ├── 20250125_rate_limit_tracking.sql     # NEW: Tiered rate limit table
    ├── 20250126_gdpr_deletion_records.sql   # NEW: GDPR audit trail
    └── 20250127_data_retention_cron.sql     # NEW: 90-day retention cron job

instrumentation.ts                    # NEW: Next.js instrumentation hook for OpenTelemetry
```

**Structure Decision**: Web application structure (Next.js App Router monorepo). All source code resides in the existing Next.js project root. New Mastra-specific code organized under `lib/mastra/`, `hooks/ai-assistant/`, and `components/ai-assistant/` following Feature-Sliced Light architecture. Backwards compatibility maintained by keeping existing `lib/ai-assistant/` directory during migration, to be deprecated post-launch.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations - constitution check passed. No additional complexity introduced.*

## Phase 0: Research & Discovery

**Objective**: Investigate Mastra Framework integration patterns and establish technical feasibility for Next.js 16 App Router embedding.

**Key Research Questions**:
1. **Runtime Compatibility**: Does Mastra Framework support Next.js Edge Runtime, or must we use Node.js runtime for `/api/mastra/*` routes?
2. **Memory Backend**: Does `@mastra/memory` provide a Supabase adapter out-of-the-box? If not, what's required to build a custom adapter?
3. **MCP Integration**: How does Mastra connect to Model Context Protocol servers - local stdio, remote HTTP, or both? What's the dynamic tool discovery API?
4. **Workflow Orchestration**: What workflow DSL does Mastra provide? Can we execute parallel steps (weather API + inventory query)?
5. **Voice Pipeline**: Does Mastra have built-in Whisper/TTS integrations, or do we implement custom API wrappers?
6. **Observability**: What observability hooks does Mastra expose (logging, metrics, tracing)? Is OpenTelemetry supported?
7. **Streaming Compatibility**: Can Mastra streaming responses maintain SSE format for Vercel AI SDK `useChat` hook compatibility?
8. **Conflict Resolution**: How does Mastra handle concurrent memory updates (for cross-device scenarios)?

**Deliverables**:
- `research.md` - Comprehensive findings with code examples
- `proof-of-concept/` - Minimal Mastra agent with Supabase memory (if feasible in research phase)

**Exit Criteria**:
- ✅ Confirmed Mastra runtime compatibility (Edge or Node.js)
- ✅ Documented memory adapter implementation approach
- ✅ Verified MCP client connection pattern
- ✅ Workflow orchestration patterns identified
- ✅ Voice integration approach defined
- ✅ Observability instrumentation strategy documented

**Estimated Duration**: 2-3 days

## Phase 1: Design & Architecture

**Objective**: Define data models, API contracts, workflow schemas, and developer setup guide.

**Task 1.1: Data Model Design** (`data-model.md`)

**Deliverables**:
1. **Conversation Memory Schema** (Supabase table):
   ```sql
   CREATE TABLE conversation_memory (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) NOT NULL,
     conversation_id text NOT NULL,
     message_role text NOT NULL, -- 'user' | 'assistant'
     message_content text NOT NULL,
     metadata jsonb, -- tool calls, timestamps, etc.
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   CREATE INDEX idx_conversation_memory_user_conversation
     ON conversation_memory(user_id, conversation_id);
   CREATE INDEX idx_conversation_memory_created_at
     ON conversation_memory(created_at); -- For retention queries
   ```

2. **Workflow Execution Schema**:
   ```sql
   CREATE TABLE workflow_executions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) NOT NULL,
     workflow_name text NOT NULL,
     input_parameters jsonb NOT NULL,
     status text NOT NULL, -- 'pending' | 'running' | 'success' | 'error'
     current_step text,
     step_results jsonb,
     error_message text,
     started_at timestamptz DEFAULT now(),
     completed_at timestamptz
   );
   ```

3. **Rate Limit Tracking Schema**:
   ```sql
   CREATE TABLE rate_limit_tracking (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) NOT NULL,
     operation_type text NOT NULL, -- 'simple_query' | 'workflow' | 'voice'
     window_start timestamptz NOT NULL,
     request_count integer DEFAULT 1,
     UNIQUE(user_id, operation_type, window_start)
   );
   ```

4. **GDPR Deletion Records Schema**:
   ```sql
   CREATE TABLE gdpr_deletion_records (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL, -- NOT a foreign key (user may be deleted)
     requested_at timestamptz DEFAULT now(),
     completed_at timestamptz,
     records_deleted jsonb -- Count of deleted records per table
   );
   ```

5. **Workflow Definition Structure** (TypeScript):
   ```typescript
   interface WorkflowDefinition {
     name: string;
     description: string;
     inputSchema: z.ZodSchema;
     steps: WorkflowStep[];
   }

   interface WorkflowStep {
     id: string;
     description: string;
     execute: (context: WorkflowContext) => Promise<unknown>;
     dependencies?: string[]; // Step IDs that must complete first
     timeout?: number; // Milliseconds
   }
   ```

**Task 1.2: API Contract Design** (`contracts/`)

**Deliverables**:
1. **`api-mastra-chat.md`** - `/api/mastra/chat` (POST)
   - Request: `{ conversationId, message, context, enableTools, enableVoice }`
   - Response: SSE stream with events: `text`, `tool_call`, `workflow_progress`, `done`, `error`
   - Auth: Supabase session required
   - Rate Limit: 100/hour (simple queries), 20/hour (workflows), 40/hour (voice)

2. **`api-mastra-memory-delete.md`** - `/api/mastra/memory/delete` (POST)
   - Request: `{ confirm: true }`
   - Response: `{ deletionId, estimatedCompletionTime }`
   - Auth: Supabase session required
   - Side Effects: Deletes all conversation memory, creates GDPR audit record

3. **`api-mastra-voice-transcribe.md`** - `/api/mastra/voice/transcribe` (POST)
   - Request: FormData with `audio` file (WAV/MP3/WebM)
   - Response: `{ text, confidence, language }`
   - Auth: Supabase session required
   - Rate Limit: 40/hour (voice operations)

4. **`api-mastra-voice-synthesize.md`** - `/api/mastra/voice/synthesize` (POST)
   - Request: `{ text, voice?, language }`
   - Response: Binary audio stream (MP3)
   - Auth: Supabase session required
   - Rate Limit: 40/hour (voice operations)

5. **`api-mastra-metrics.md`** - `/api/mastra/metrics` (GET)
   - Request: None (public endpoint for Prometheus scraping)
   - Response: Prometheus text format
   - Metrics: `mastra_agent_latency_seconds`, `mastra_workflow_duration_seconds`, `mastra_tool_calls_total`, `mastra_memory_operations_total`, `mastra_errors_total`

**Task 1.3: Developer Setup Guide** (`quickstart.md`)

**Deliverables**:
- Environment variable setup (Mastra config, MCP server URL, Whisper/TTS API keys)
- Local Supabase migration instructions
- MCP server setup (GearGraph local development)
- Running Mastra agent locally (debugging workflows)
- Testing voice pipeline (audio file uploads)
- Viewing observability traces (Grafana/Jaeger setup)

**Exit Criteria**:
- ✅ All Supabase schemas documented and validated
- ✅ API contracts specify request/response formats with examples
- ✅ Developer guide enables local Mastra development
- ✅ No blocking technical questions remain from Phase 0

**Estimated Duration**: 2-3 days

## Phase 2: Core Mastra Integration

**Objective**: Implement foundational Mastra agent with Supabase memory backend and streaming API route.

**Task 2.1: Supabase Memory Backend**

**Implementation**:
- Create Supabase migration `20250120_conversation_memory.sql`
- Implement custom `@mastra/memory` adapter for Supabase in `lib/mastra/memory-adapter.ts`
- Add last-write-wins conflict resolution (timestamp-based)
- Test memory persistence across sessions (unit tests)

**Files**:
- `supabase/migrations/20250120_conversation_memory.sql`
- `lib/mastra/memory-adapter.ts`
- `types/mastra.ts` (ConversationMemory interface)

**Acceptance Criteria**:
- ✅ Agent stores conversation messages in `conversation_memory` table
- ✅ Memory retrieves correctly across user sessions
- ✅ Concurrent updates resolved by timestamp (last-write-wins)
- ✅ Unit tests pass for memory adapter

**Estimated Duration**: 1-2 days

**Task 2.2: Mastra Agent Initialization**

**Implementation**:
- Install `mastra` npm package
- Initialize Mastra agent in `lib/mastra/agent.ts`
- Configure Claude model via Vercel AI SDK integration
- Migrate system prompt from `lib/ai-assistant/prompt-builder.ts` to Mastra agent config
- Implement Supabase auth adapter in `lib/mastra/auth-adapter.ts`

**Files**:
- `lib/mastra/agent.ts`
- `lib/mastra/config.ts`
- `lib/mastra/auth-adapter.ts`

**Acceptance Criteria**:
- ✅ Agent initializes with Claude Sonnet 4.5 via AI Gateway
- ✅ Agent authenticates users via Supabase session
- ✅ System prompt includes inventory analysis (from existing `buildSystemPrompt`)
- ✅ Agent passes smoke test (simple query response)

**Estimated Duration**: 1-2 days

**Task 2.3: Streaming API Route with Memory**

**Implementation**:
- Create `/api/mastra/chat` route in `app/api/mastra/chat/route.ts`
- Implement SSE streaming with Mastra agent (maintain Vercel AI SDK format)
- Add conversation memory persistence on each turn (before and after LLM call)
- Maintain backwards compatibility with `useChat` hook
- Add rate limiting enforcement (100 messages/hour for simple queries)

**Files**:
- `app/api/mastra/chat/route.ts`
- `lib/mastra/streaming.ts`
- `hooks/ai-assistant/useMastraChat.ts` (replaces existing `useChat` usage)

**Acceptance Criteria**:
- ✅ Streaming responses work with existing frontend
- ✅ Conversation memory persists after each message
- ✅ Rate limiting enforced (100/hour)
- ✅ Memory retrieval works when conversation resumes (cross-session test)
- ✅ SSE format compatible with `useChat` hook

**Estimated Duration**: 2 days

**Phase 2 Total**: 4-5 days

## Phase 3: MCP Integration & Tool Migration

**Objective**: Connect Mastra agent to GearGraph MCP server and migrate existing tools to Mastra format.

**Task 3.1: MCP Client Setup**

**Implementation**:
- Install `@modelcontextprotocol/sdk`
- Implement MCP client connection in `lib/mastra/mcp-client.ts`
- Configure GearGraph MCP server URL (environment variable)
- Implement dynamic tool discovery (list available tools)
- Add graceful error handling (fallback to catalog search when MCP unavailable)

**Files**:
- `lib/mastra/mcp-client.ts`
- `lib/mastra/mcp-tools.ts`

**Acceptance Criteria**:
- ✅ MCP client connects to GearGraph server (local or remote)
- ✅ Tools dynamically discovered and listed
- ✅ Connection errors handled gracefully (agent continues without MCP tools)
- ✅ Fallback to `searchCatalog` when MCP unavailable

**Estimated Duration**: 1-2 days

**Task 3.2: Tool Migration to Mastra Format**

**Implementation**:
- Migrate existing 6 tools to Mastra agent format:
  - `queryUserData` → `lib/mastra/tools/query-user-data.ts`
  - `searchCatalog` → `lib/mastra/tools/search-catalog.ts`
  - `searchWeb` → `lib/mastra/tools/search-web.ts`
  - `addToWishlist`, `sendMessage`, `navigate` (actions) → Keep execution logic
- Preserve existing tool execution logic (no business logic changes)
- Add MCP-based graph traversal tools in `lib/mastra/tools/mcp-graph.ts`
- Test tool calling during streaming (integration test)

**Files**:
- `lib/mastra/tools/query-user-data.ts`
- `lib/mastra/tools/search-catalog.ts`
- `lib/mastra/tools/search-web.ts`
- `lib/mastra/tools/mcp-graph.ts` (NEW)

**Acceptance Criteria**:
- ✅ All 6 existing tools work in Mastra agent
- ✅ MCP graph tools callable by agent (e.g., "find tents with similar weight")
- ✅ Tool results formatted consistently
- ✅ Tool calling works during streaming (SSE events include tool metadata)

**Estimated Duration**: 2 days

**Phase 3 Total**: 3-4 days

## Phase 4: Workflow Orchestration

**Objective**: Implement multi-step trip planning workflow with parallel data gathering and sequential reasoning.

**Task 4.1: Workflow Execution Framework**

**Implementation**:
- Define workflow DSL in `lib/mastra/workflows/base.ts`
- Create Supabase migration `20250122_workflow_executions.sql`
- Implement workflow execution tracking (status, current step, results)
- Add streaming progress updates during workflow steps (SSE events)
- Implement timeout handling (10 seconds max per workflow)

**Files**:
- `lib/mastra/workflows/base.ts`
- `supabase/migrations/20250122_workflow_executions.sql`
- `types/mastra.ts` (WorkflowExecution interface)

**Acceptance Criteria**:
- ✅ Workflow executions tracked in `workflow_executions` table
- ✅ Progress updates stream to UI (e.g., "Gathering weather data...")
- ✅ Workflow errors handled gracefully (partial results returned)
- ✅ Timeout enforced at 10 seconds

**Estimated Duration**: 2 days

**Task 4.2: Trip Planning Workflow Implementation**

**Implementation**:
- Implement trip planner workflow in `lib/mastra/workflows/trip-planner.ts`:
  1. **Step 1**: Intent analysis (parse location, season, weight constraints)
  2. **Step 2**: Parallel data gathering (weather API + user inventory query)
  3. **Step 3**: Gap analysis (compare user gear to environmental requirements)
  4. **Step 4**: Graph query (find alternatives via MCP)
  5. **Step 5**: Recommendation synthesis (stream final plan)
- Add weather API integration in `lib/external-apis/weather.ts`
- Implement partial results on step failures (e.g., if weather API fails, proceed with cached data)

**Files**:
- `lib/mastra/workflows/trip-planner.ts`
- `lib/external-apis/weather.ts`

**Acceptance Criteria**:
- ✅ Workflow completes in under 10 seconds (90% of test cases)
- ✅ Steps 2 (weather + inventory) execute in parallel (not sequentially)
- ✅ Partial results provided on failures (e.g., weather API timeout)
- ✅ Final plan streams incrementally to UI

**Estimated Duration**: 2-3 days

**Phase 4 Total**: 4-5 days

## Phase 5: Voice Interaction

**Objective**: Implement voice input (Whisper transcription) and voice output (TTS synthesis) with sub-3-second latency.

**Task 5.1: Voice Input - Whisper Transcription**

**Implementation**:
- Create `/api/mastra/voice/transcribe` route
- Integrate Whisper API (OpenAI Whisper or local deployment)
- Add confidence threshold checks (70% minimum)
- Implement retry prompt on low confidence ("I didn't catch that, please try again")
- Add audio file validation (format, size limits)

**Files**:
- `app/api/mastra/voice/transcribe/route.ts`
- `lib/mastra/voice/whisper.ts`
- `hooks/ai-assistant/useVoiceInput.ts`

**Acceptance Criteria**:
- ✅ Audio captured from browser MediaRecorder API
- ✅ Transcription returns text with confidence score
- ✅ Retry prompt shown when confidence < 70%
- ✅ Transcription accuracy ≥95% for clear speech (manual QA)

**Estimated Duration**: 2 days

**Task 5.2: Voice Output - TTS Synthesis**

**Implementation**:
- Create `/api/mastra/voice/synthesize` route
- Integrate TTS API (ElevenLabs or OpenAI TTS)
- Add automatic playback on response completion
- Implement pause/stop controls (Web Audio API)
- Add streaming TTS (start playback before synthesis completes)

**Files**:
- `app/api/mastra/voice/synthesize/route.ts`
- `lib/mastra/voice/tts.ts`
- `hooks/ai-assistant/useVoiceOutput.ts`

**Acceptance Criteria**:
- ✅ Text responses synthesized to audio (MP3 format)
- ✅ Audio plays automatically after generation
- ✅ Pause/stop controls work correctly
- ✅ Streaming TTS reduces perceived latency (starts playback within 1s)

**Estimated Duration**: 2 days

**Task 5.3: Voice UI Components**

**Implementation**:
- Create voice input button (`components/ai-assistant/VoiceInputButton.tsx`)
- Add recording indicator (`components/ai-assistant/VoiceRecordingIndicator.tsx`)
- Display live transcription text during recording
- Show audio playback controls (`components/ai-assistant/AudioPlaybackControls.tsx`)
- Add voice settings dialog (enable/disable, language preference)

**Files**:
- `components/ai-assistant/VoiceInputButton.tsx`
- `components/ai-assistant/VoiceRecordingIndicator.tsx`
- `components/ai-assistant/AudioPlaybackControls.tsx`

**Acceptance Criteria**:
- ✅ Voice button accessible in chat interface (mic icon)
- ✅ Recording indicator shows pulsing animation
- ✅ Transcription appears in real-time (as it's processed)
- ✅ Playback controls functional (pause, stop, volume)

**Estimated Duration**: 1 day

**Task 5.4: Latency Optimization**

**Implementation**:
- Benchmark end-to-end voice pipeline (audio capture → transcription → LLM → TTS → playback)
- Optimize audio encoding (reduce file size, use optimal format)
- Implement streaming TTS (start playback before synthesis completes)
- Add local caching for common TTS responses (e.g., "I'm sorry, I didn't catch that")
- Profile and reduce API call overhead

**Acceptance Criteria**:
- ✅ 90% of voice queries complete in <3 seconds (end-to-end)
- ✅ 99% of voice queries complete in <5 seconds (end-to-end)
- ✅ Streaming TTS starts playback within 1 second of text generation

**Estimated Duration**: 1 day

**Phase 5 Total**: 5-6 days

## Phase 6: Observability & Instrumentation

**Objective**: Implement comprehensive structured logging, Prometheus metrics, and OpenTelemetry distributed tracing.

**Task 6.1: Structured Logging**

**Implementation**:
- Configure JSON logging in `lib/mastra/logging.ts`
- Add context fields (userId, conversationId, workflowId, traceId)
- Log all memory writes with timestamps (audit trail)
- Sanitize PII from logs (email, phone numbers, etc.) in `lib/mastra/log-sanitizer.ts`
- Log all agent operations (LLM calls, tool executions, workflow steps)

**Files**:
- `lib/mastra/logging.ts`
- `lib/mastra/log-sanitizer.ts`

**Acceptance Criteria**:
- ✅ All agent operations logged in JSON format
- ✅ Logs include correlation IDs for tracing (userId, conversationId)
- ✅ No PII in logs (emails, phone numbers sanitized)
- ✅ Memory writes logged with timestamps

**Estimated Duration**: 1-2 days

**Task 6.2: Prometheus Metrics**

**Implementation**:
- Install `prom-client` npm package
- Create `/api/mastra/metrics` endpoint in `app/api/mastra/metrics/route.ts`
- Export latency percentiles (P50, P95, P99) for agent responses
- Track error rates by type (network, validation, timeout)
- Measure workflow step durations
- Track tool call counts by tool name
- Track memory operation counts (reads, writes, deletes)

**Files**:
- `app/api/mastra/metrics/route.ts`
- `lib/mastra/metrics.ts`

**Acceptance Criteria**:
- ✅ `/api/mastra/metrics` endpoint returns Prometheus text format
- ✅ Latency percentiles accurate (P50, P95, P99)
- ✅ Error rates categorized by type
- ✅ Workflow step durations tracked
- ✅ Metrics exportable to Grafana/Prometheus

**Estimated Duration**: 1-2 days

**Task 6.3: Distributed Tracing with OpenTelemetry**

**Implementation**:
- Configure OpenTelemetry in `instrumentation.ts` (Next.js instrumentation hook)
- Add span instrumentation for workflow steps in `lib/mastra/tracing.ts`
- Trace cross-service calls (MCP, weather API, TTS, Whisper)
- Export traces to observability backend (Sentry, Grafana Cloud, or Jaeger)
- Add trace context propagation (traceId in logs and API responses)

**Files**:
- `instrumentation.ts`
- `lib/mastra/tracing.ts`

**Acceptance Criteria**:
- ✅ Multi-step workflows produce complete distributed traces
- ✅ External service calls traced end-to-end (MCP, weather, TTS)
- ✅ Traces exported to observability platform
- ✅ Trace IDs propagated in logs for correlation

**Estimated Duration**: 1 day

**Phase 6 Total**: 3-4 days

## Phase 7: Rate Limiting & GDPR Compliance

**Objective**: Implement tiered rate limiting (simple/workflow/voice) and GDPR data deletion mechanisms.

**Task 7.1: Tiered Rate Limiting**

**Implementation**:
- Create Supabase migration `20250125_rate_limit_tracking.sql`
- Implement rate limiter in `lib/mastra/rate-limiter.ts`:
  - Simple queries: unlimited
  - Workflows: 20/hour
  - Voice: 40/hour
- Enforce limits at API route level (before agent invocation)
- Return clear error messages (which limit exceeded, reset time)
- Add rate limit headers in API responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`)

**Files**:
- `supabase/migrations/20250125_rate_limit_tracking.sql`
- `lib/mastra/rate-limiter.ts`
- `app/api/mastra/chat/route.ts` (enforce workflow limit)
- `app/api/mastra/voice/transcribe/route.ts` (enforce voice limit)

**Acceptance Criteria**:
- ✅ Simple queries not rate limited
- ✅ Workflow executions limited to 20/hour per user
- ✅ Voice interactions limited to 40/hour per user
- ✅ Error messages indicate limit type and reset time
- ✅ Rate limit headers returned in API responses

**Estimated Duration**: 1-2 days

**Task 7.2: GDPR Data Deletion Endpoint**

**Implementation**:
- Create `/api/mastra/memory/delete` endpoint
- Implement full conversation memory deletion (all rows for userId)
- Create Supabase migration `20250126_gdpr_deletion_records.sql`
- Add audit trail in `gdpr_deletion_records` table
- Sanitize userId from logs after deletion (background job)
- Complete deletion within 24 hours (background worker)

**Files**:
- `app/api/mastra/memory/delete/route.ts`
- `supabase/migrations/20250126_gdpr_deletion_records.sql`
- `lib/mastra/gdpr.ts`

**Acceptance Criteria**:
- ✅ User can request memory deletion via API
- ✅ All conversation data deleted from `conversation_memory` table
- ✅ Deletion recorded in `gdpr_deletion_records` audit trail
- ✅ Logs sanitized (userId removed from structured logs)
- ✅ Deletion completes within 24 hours

**Estimated Duration**: 1-2 days

**Task 7.3: Automatic Data Retention (90-day)

**Implementation**:
- Create Supabase cron job migration `20250127_data_retention_cron.sql`
- Archive conversations older than 90 days (move to `conversation_memory_archive` table)
- Purge archived conversations after retention period
- Maintain anonymized metrics (aggregate stats without userId)

**Files**:
- `supabase/migrations/20250127_data_retention_cron.sql`

**Acceptance Criteria**:
- ✅ Conversations older than 90 days automatically archived
- ✅ Archived data purged after retention period
- ✅ Metrics preserved (anonymized - no userId)
- ✅ Cron job runs daily

**Estimated Duration**: 1 day

**Phase 7 Total**: 3-4 days

## Phase 8: Testing & Validation

**Objective**: Comprehensive testing of all agentic features against success criteria from spec.

**Task 8.1: Memory Persistence Tests**

**Test Scenarios** (from User Story 1):
1. ✅ User has conversation in session A, closes app, reopens in session B → AI recalls specific facts from session A
2. ✅ User asks "What did we discuss yesterday?" → AI provides summary of previous day's conversations
3. ✅ User states "I prefer ultralight gear" in one conversation → AI applies preference automatically in future conversations
4. ✅ User switches devices (phone → tablet) → AI memory consistent across devices
5. ✅ Conversation history exceeds 90 days → Older memories archived/summarized

**Estimated Duration**: 1 day

**Task 8.2: Workflow Tests**

**Test Scenarios** (from User Story 2):
1. ✅ User requests trip plan with location/season/constraints → Workflow steps execute in correct order
2. ✅ Weather + inventory queries execute in parallel (not sequentially)
3. ✅ AI identifies gear gaps → Queries GearGraph via MCP for alternatives
4. ✅ Final trip plan streams incrementally (environment → gaps → recommendations → cost)
5. ✅ Weather API fails → AI explains error, provides partial results

**Estimated Duration**: 1 day

**Task 8.3: MCP Integration Tests**

**Test Scenarios** (from User Story 3):
1. ✅ User asks for alternatives to specific gear → MCP query retrieves similar items with metrics
2. ✅ MCP provides multiple alternatives → AI presents with graph-derived reasoning
3. ✅ User asks "What is a lighter alternative to X?" → AI only returns items lighter than X
4. ✅ Complex graph traversal (e.g., "Find tents used by users who own my sleeping bag") → MCP tools invoked correctly
5. ✅ GearGraph MCP server unavailable → AI falls back to catalog search, informs user

**Estimated Duration**: 1 day

**Task 8.4: Voice Interaction Tests**

**Test Scenarios** (from User Story 4):
1. ✅ User speaks question → Transcription accuracy ≥95% for clear speech
2. ✅ Transcription completes → AI processes query (same as typed)
3. ✅ AI generates response → TTS synthesis plays automatically
4. ✅ End-to-end voice latency: 90% <3s, 99% <5s
5. ✅ Ambient noise interferes → Confidence <70% triggers retry prompt
6. ✅ Noisy environment → Pause button and live transcript appear

**Estimated Duration**: 1 day

**Task 8.5: Performance & Scale Tests**

**Test Scenarios**:
1. ✅ 25 concurrent users → No degradation in response latency
2. ✅ Workflow P95 latency <10 seconds under load
3. ✅ Rate limits enforced correctly (20 workflows/hour, 40 voice/hour)
4. ✅ Observability overhead <5% latency increase

**Estimated Duration**: 1 day

**Phase 8 Total**: 5-6 days

## Phase 9: Documentation & Deployment

**Objective**: Finalize documentation and deploy to production.

**Task 9.1: Developer Documentation**

**Deliverables**:
- `architecture.md` - System architecture overview (agent, memory, workflows, MCP)
- `api-reference.md` - Complete API endpoint documentation
- `troubleshooting.md` - Common issues and solutions

**Estimated Duration**: 1 day

**Task 9.2: User Documentation**

**Deliverables**:
- Voice interaction guide (in-app tooltip)
- Memory settings explanation (what data is stored, how long)
- GDPR data deletion instructions (how to request, what's deleted)

**Estimated Duration**: 1 day

**Task 9.3: Production Deployment**

**Implementation**:
- Deploy Supabase migrations (conversation_memory, workflow_executions, rate_limit_tracking, gdpr_deletion_records, data_retention_cron)
- Configure production environment variables (Mastra config, MCP server URL, Whisper/TTS API keys)
- Set up observability monitoring (Prometheus scraping, Grafana dashboards)
- Deploy Next.js application to Vercel
- Smoke test in production (simple query, workflow, voice interaction)

**Estimated Duration**: 1 day

**Phase 9 Total**: 2-3 days

## Total Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Research | 2-3 days | None |
| Phase 1: Design | 2-3 days | Phase 0 complete |
| Phase 2: Core Mastra | 4-5 days | Phase 1 complete |
| Phase 3: MCP Integration | 3-4 days | Phase 2 complete |
| Phase 4: Workflows | 4-5 days | Phase 3 complete |
| Phase 5: Voice | 5-6 days | Phase 2, Phase 4 complete |
| Phase 6: Observability | 3-4 days | Phase 2 complete |
| Phase 7: Rate Limiting & GDPR | 3-4 days | Phase 2 complete |
| Phase 8: Testing | 5-6 days | All previous phases complete |
| Phase 9: Documentation & Deployment | 2-3 days | Phase 8 complete |

**Total**: 33-43 days (7-9 weeks) for full implementation and testing

**Parallelization Opportunities**:
- Phase 5 (Voice), Phase 6 (Observability), Phase 7 (Rate Limiting) can partially overlap (all depend on Phase 2 Core Mastra)
- Optimized timeline with parallelization: ~30-38 days (6-8 weeks)

## Risk Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Mastra Framework lacks Supabase memory adapter | High | Medium | Implement custom adapter in Phase 2.1 (budgeted 2 days extra) |
| MCP connection latency exceeds budget (>500ms) | Medium | Low | Implement aggressive caching + fallback to catalog search |
| Voice latency > 3 seconds (P90) | Medium | Medium | Use streaming TTS, optimize audio encoding, cache common responses |
| Edge runtime incompatible with Mastra | High | Low | Use Node.js runtime for `/api/mastra/*` routes (Next.js 16 allows per-route runtime) |
| Prometheus metrics cause performance overhead | Low | Low | Sample metrics (10% of requests), async export to avoid blocking |
| GDPR deletion within 24 hours not feasible | High | Low | Use background job with confirmation email, document completion time |
| Workflow timeout (10s) too aggressive | Medium | Medium | Increase timeout to 15s, optimize parallel steps, profile bottlenecks |
| Cross-device memory sync latency >2s | Low | Low | Add Supabase Realtime for instant sync, fallback to polling |

## Success Metrics (from spec.md)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **SC-001**: Memory recall accuracy | 95% across 100 test conversations | Automated test suite (Phase 8.1) |
| **SC-002**: Workflow completion time (P90) | <10 seconds | Prometheus metrics (Phase 6.2) |
| **SC-004**: Voice latency (P90 end-to-end) | <3 seconds | End-to-end benchmarking (Phase 5.4) |
| **SC-003**: MCP query success rate | 100% when server available | Observability logs (Phase 6.1) |
| **SC-005**: Graceful degradation | Stateless mode when memory unavailable | Integration tests (Phase 8) |
| **SC-006**: Preference application accuracy | 90% of recommendation requests | Manual QA review (Phase 8.1) |
| **SC-007**: Workflow progress streaming | ≥3 visible stages before final response | Integration tests (Phase 8.2) |
| **SC-008**: Memory correction latency | <1 second to update | Performance tests (Phase 8.1) |
| **SC-009**: Existing feature parity | Tool calling, inline cards, actions at pre-migration levels | Regression tests (Phase 8) |
| **SC-010**: Cross-device sync latency | <2 seconds | Performance tests (Phase 8.1) |
| **SC-011**: Observability completeness | 100% of workflows traced, all ops logged, metrics dashboards functional | Manual validation (Phase 6) |
| **SC-012**: Concurrent user capacity | 25 users without degradation | Load testing (Phase 8.5) |

## Post-Launch Monitoring

**Week 1 After Launch**:
- Monitor P95 latency for all operations (agent responses, workflows, voice)
- Track error rates by type (network, validation, timeout, MCP failures)
- Review GDPR deletion request volume and completion times
- Measure voice interaction adoption rate (% of users using voice)
- Monitor rate limit hit rates (are users hitting 20 workflow/hour limit?)

**Week 2-4 After Launch**:
- Analyze memory recall accuracy in production (sample conversations)
- Identify workflow bottlenecks via distributed traces (which steps are slow?)
- Optimize slow workflows based on Prometheus metrics
- Gather user feedback on voice quality (transcription accuracy, TTS naturalness)
- Review MCP tool usage patterns (which tools most frequently called?)

**Month 2 Onward**:
- Plan P3 features (User Story 5: Personalized Expertise Recall)
- Evaluate MCP tool usage patterns (are graph traversals valuable?)
- Consider additional workflow types (gear upgrade planner, packing list generator)
- Assess scaling needs (is 25 concurrent users sufficient for actual usage?)
- Review GDPR compliance (are deletion requests completing within 24 hours?)
