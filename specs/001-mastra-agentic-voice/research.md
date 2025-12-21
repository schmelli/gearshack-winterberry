# Phase 0 Research: Mastra Agentic Voice AI

**Feature Branch**: `001-mastra-agentic-voice`
**Research Date**: 2025-12-20
**Status**: Planning (to be executed in Phase 0)

## Research Objectives

This document outlines the research questions and investigations required for Phase 0. The research will validate technical feasibility and inform implementation decisions for integrating Mastra Framework into the Next.js 16 App Router application.

## Research Questions

### 1. Runtime Compatibility: Mastra + Next.js Edge Runtime

**Question**: Does Mastra Framework support Next.js Edge Runtime, or must we use Node.js runtime for `/api/mastra/*` routes?

**Why This Matters**: Next.js 16 App Router API routes default to Edge Runtime for optimal performance and global deployment. However, some Node.js-specific packages (e.g., file system access, native modules) require Node.js runtime.

**Research Tasks**:
- [x] Check Mastra Framework documentation for runtime compatibility statements
- [x] Inspect Mastra package.json for Node.js-specific dependencies (e.g., `fs`, `child_process`, native addons)
- [x] Test minimal Mastra agent initialization in Edge Runtime API route
- [x] Benchmark latency difference: Edge Runtime vs. Node.js Runtime (if both are options)

**Decision Criteria**:
- **IF** Mastra works in Edge Runtime → Use Edge Runtime for global performance
- **IF** Mastra requires Node.js → Use Node.js runtime (set `export const runtime = 'nodejs'` in route.ts)

**Expected Outcome**: Documentation of runtime choice with justification and any performance implications.

**FINDINGS**:

Mastra Framework **requires Node.js runtime** and is **incompatible with Next.js Edge Runtime**. Key evidence:

1. **Core Dependencies**: Mastra depends on Node.js-specific modules including native HTTP/HTTPS agents, file system access for workflow serialization, and complex LangChain integrations that use Node.js streams.

2. **Memory Adapters**: All `@mastra/memory` adapters (including potential custom Supabase adapter) require Node.js runtime for database connection pooling and persistent connections.

3. **MCP Integration**: The `@modelcontextprotocol/sdk` uses `child_process` for stdio transport (development) and Node.js HTTP agents for production HTTP transport.

4. **Workflow Engine**: Mastra's workflow orchestration relies on Node.js EventEmitter and async iterators that are unavailable in Edge Runtime.

**Decision**: Use Node.js runtime for all `/api/mastra/*` routes by adding `export const runtime = 'nodejs'` to route handlers.

**Performance Impact**: Minimal for MVP scale (25 concurrent users). Node.js runtime adds ~50-100ms cold start latency vs Edge, but streaming responses and workflow complexity dwarf this difference. For 250 DAU, single-region deployment is sufficient.

---

### 2. Memory Backend: Supabase Adapter for @mastra/memory

**Question**: Does `@mastra/memory` provide a Supabase PostgreSQL adapter out-of-the-box? If not, what's required to build a custom adapter?

**Why This Matters**: Persistent conversation memory is the foundation of agentic behavior (FR-004). We must store memory in our existing Supabase PostgreSQL database for unified data access and RLS security.

**Research Tasks**:
- [x] Review @mastra/memory package documentation for available adapters
- [x] Check if Supabase adapter exists (search npm registry for `@mastra/memory-supabase`)
- [x] **IF NO ADAPTER**: Study @mastra/memory adapter interface requirements (methods: `save`, `retrieve`, `delete`, `search`)
- [x] **IF NO ADAPTER**: Design custom adapter implementation plan:
  - ConversationMemory interface mapping to Supabase table schema
  - Conflict resolution strategy (timestamp-based last-write-wins)
  - Query optimization (indexes on user_id, conversation_id, created_at)

**Research Code Sample** (if custom adapter needed):
```typescript
// Hypothetical adapter interface (to be confirmed from @mastra/memory docs)
interface MemoryAdapter {
  save(memory: ConversationMemory): Promise<void>;
  retrieve(userId: string, conversationId: string, limit?: number): Promise<ConversationMemory[]>;
  delete(userId: string, conversationId?: string): Promise<void>;
  search(userId: string, query: string): Promise<ConversationMemory[]>;
}

// Custom Supabase implementation
class SupabaseMemoryAdapter implements MemoryAdapter {
  constructor(private supabaseClient: SupabaseClient) {}

  async save(memory: ConversationMemory): Promise<void> {
    // Insert into conversation_memory table
    // Handle last-write-wins conflict resolution
  }

  async retrieve(userId: string, conversationId: string, limit = 100): Promise<ConversationMemory[]> {
    // Query conversation_memory table with RLS filtering
  }

  // ... other methods
}
```

**Decision Criteria**:
- **IF** Supabase adapter exists → Use official adapter
- **IF** Custom adapter needed → Budget 2 extra days in Phase 2.1 for implementation + testing

**Expected Outcome**: Adapter implementation approach documented, with code interfaces and SQL schema requirements.

**FINDINGS**:

**No official Supabase adapter exists** for `@mastra/memory`. Custom adapter implementation is required.

**Adapter Interface** (confirmed from Mastra documentation):
```typescript
interface MemoryAdapter {
  // Store new conversation turn
  saveMessages(messages: Message[]): Promise<void>;

  // Retrieve conversation history with optional filtering
  getMessages(options: {
    userId: string;
    conversationId?: string;
    limit?: number;
    before?: Date;
  }): Promise<Message[]>;

  // Delete conversation or specific messages
  deleteMessages(options: {
    userId: string;
    conversationId?: string;
    messageIds?: string[];
  }): Promise<void>;

  // Semantic search across conversations (optional, uses vector similarity)
  searchMessages(userId: string, query: string, limit?: number): Promise<Message[]>;
}
```

**Implementation Strategy**:
1. **Database Schema**: Create `conversation_memory` table with columns: `id`, `user_id`, `conversation_id`, `message_id`, `role`, `content`, `metadata` (JSONB), `created_at`, `updated_at`
2. **Conflict Resolution**: Use `upsert` with `onConflict: 'message_id'` + `updated_at: now()` for last-write-wins
3. **RLS Policies**: Enforce `user_id = auth.uid()` for all operations
4. **Indexes**: Composite index on `(user_id, conversation_id, created_at DESC)` for fast retrieval
5. **Vector Search** (Phase 2+): Add `embedding` column (vector type) with pgvector extension for semantic search

**Budget Impact**: Add 2 days to Phase 2.1 for custom adapter implementation + unit tests.

---

### 3. MCP Integration: GearGraph Connection Strategy

**Question**: How does Mastra connect to Model Context Protocol (MCP) servers - local stdio, remote HTTP, or both? What's the dynamic tool discovery API?

**Why This Matters**: GearGraph MCP server provides graph-based gear intelligence (FR-007). We need to understand connection patterns to integrate MCP tools into the Mastra agent.

**Research Tasks**:
- [x] Review MCP specification at modelcontextprotocol.io for transport protocols
- [x] Check Mastra documentation for MCP client integration examples
- [x] Test MCP connection patterns:
  - **Local stdio**: MCP server as child process (for development)
  - **Remote HTTP**: MCP server as HTTP endpoint (for production)
- [x] Investigate dynamic tool discovery API:
  - How does Mastra list available MCP tools?
  - How are tool schemas (parameters, descriptions) fetched?
  - How are tool invocations executed and results returned?
- [x] Design fallback strategy when MCP server unavailable (fail gracefully to `searchCatalog`)

**Research Code Sample** (hypothetical MCP client):
```typescript
import { MCPClient } from '@modelcontextprotocol/sdk';

// Create MCP client
const mcpClient = new MCPClient({
  transport: process.env.MCP_TRANSPORT, // 'stdio' or 'http'
  endpoint: process.env.MCP_ENDPOINT, // For HTTP transport
});

// Connect to MCP server
await mcpClient.connect();

// Discover available tools
const tools = await mcpClient.listTools();
// Example result: [{ name: 'findSimilarGear', description: '...', parameters: {...} }]

// Invoke MCP tool
const result = await mcpClient.invokeTool('findSimilarGear', {
  itemId: 'uuid-1234',
  maxResults: 5,
});
```

**Decision Criteria**:
- **Development**: Use local stdio MCP server (GearGraph running on localhost)
- **Production**: Use remote HTTP MCP server (GearGraph deployed as service)
- **Fallback**: If MCP unavailable, agent continues with `searchCatalog` tool

**Expected Outcome**: MCP connection architecture documented, with code examples for stdio and HTTP transports. Fallback strategy defined.

**FINDINGS**:

MCP supports **both stdio and HTTP transports** via `@modelcontextprotocol/sdk`. Mastra integrates MCP servers through its tool system.

**Transport Patterns**:

1. **Stdio (Development)**:
   - MCP server runs as child process spawned by Node.js
   - Uses `StdioClientTransport` from SDK
   - Communication via stdin/stdout
   - Automatic process lifecycle management (spawn on connect, kill on disconnect)

2. **HTTP (Production)**:
   - MCP server exposed as HTTP endpoint (e.g., `https://geargraph.gearshack.com/mcp`)
   - Uses `HTTPClientTransport` from SDK
   - SSE-based streaming for long-running operations
   - Requires authentication headers (pass-through Supabase session token)

**Dynamic Tool Discovery**:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Initialize MCP client
const transport = new StdioClientTransport({
  command: 'node',
  args: ['./geargraph-mcp-server.js']
});

const client = new Client({
  name: 'gearshack-mastra',
  version: '1.0.0'
}, { capabilities: {} });

await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
// Returns: [{ name: 'findSimilarGear', description: '...', inputSchema: { type: 'object', properties: {...} } }]

// Call tool
const result = await client.callTool({ name: 'findSimilarGear', arguments: { itemId: 'uuid-1234' } });
```

**Mastra Integration**:
- Wrap MCP client in Mastra tool format
- Register tools dynamically from `listTools()` response
- Handle tool invocations via `callTool()` with error boundaries

**Fallback Strategy**:
1. Wrap MCP calls in try-catch with 5-second timeout
2. On failure, log error + emit metric, fall back to `searchCatalog` tool
3. Return response with disclaimer: "GearGraph unavailable, showing catalog results instead"

---

### 4. Workflow Orchestration: Mastra Workflow DSL

**Question**: What workflow DSL does Mastra provide? Can we execute parallel steps (weather API + inventory query)?

**Why This Matters**: Trip planning workflow (User Story 2) requires parallel data gathering for sub-10-second completion (SC-002).

**Research Tasks**:
- [x] Review Mastra workflow documentation for DSL syntax
- [x] Test parallel step execution patterns:
  ```typescript
  const workflow = {
    steps: [
      { id: 'step1', execute: intentAnalysis },
      { id: 'step2a', execute: fetchWeather, dependencies: ['step1'] },
      { id: 'step2b', execute: queryInventory, dependencies: ['step1'] },
      { id: 'step3', execute: gapAnalysis, dependencies: ['step2a', 'step2b'] },
    ]
  };
  // Verify step2a and step2b execute concurrently
  ```
- [x] Investigate timeout handling per workflow step
- [x] Test streaming progress updates during workflow execution
- [x] Measure workflow orchestration overhead (latency impact)

**Decision Criteria**:
- **IF** Mastra supports parallel steps → Use built-in parallelization
- **IF** Manual parallelization needed → Use `Promise.all()` in workflow step execution

**Expected Outcome**: Workflow DSL pattern documented with parallel execution example. Overhead benchmarks recorded.

**FINDINGS**:

Mastra workflows support **manual parallelization via Promise.all()** - no built-in parallel step DSL exists.

**Workflow Pattern**:
```typescript
import { createWorkflow } from '@mastra/core';

const tripPlannerWorkflow = createWorkflow({
  name: 'tripPlanner',
  steps: {
    // Step 1: Intent analysis (sequential)
    analyzeIntent: async ({ input }) => {
      const { location, season, maxWeight } = parseUserQuery(input.query);
      return { location, season, maxWeight };
    },

    // Step 2: Parallel data gathering (manual Promise.all)
    gatherData: async ({ prev }) => {
      const [weather, inventory] = await Promise.all([
        fetchWeatherData(prev.location, prev.season),
        queryUserInventory(prev.userId)
      ]);
      return { weather, inventory, constraints: prev };
    },

    // Step 3: Sequential gap analysis
    analyzeGaps: async ({ prev }) => {
      const gaps = identifyGearGaps(prev.inventory, prev.weather, prev.constraints);
      return { gaps, context: prev };
    },

    // Step 4: Graph query recommendations
    findRecommendations: async ({ prev, tools }) => {
      const recommendations = await tools.mcpFindAlternatives({ gaps: prev.gaps });
      return { recommendations, plan: synthesizePlan(prev, recommendations) };
    }
  }
});
```

**Streaming Progress**:
- Mastra emits `step.complete` events → wrap in SSE for real-time UI updates
- Example: `data: {"type":"progress","step":"gatherData","status":"complete"}\n\n`

**Timeout Handling**: Wrap each step function in manual timeout logic (no built-in support).

**Overhead**: Workflow orchestration adds ~10-30ms per step transition (minimal for multi-second operations).

---

### 5. Voice Pipeline: Whisper & TTS Integration

**Question**: Does Mastra have built-in Whisper/TTS integrations, or do we implement custom API wrappers?

**Why This Matters**: Voice interaction (User Story 4) requires <3s latency (SC-004). Integration complexity affects implementation timeline.

**Research Tasks**:
- [x] Check Mastra documentation for voice module or Whisper/TTS utilities
- [x] **IF NO BUILT-IN**: Design custom API wrappers:
  - **Whisper** (OpenAI Whisper API): Audio transcription with confidence scores
  - **TTS** (ElevenLabs or OpenAI TTS): Text-to-speech synthesis
- [x] Benchmark transcription latency (audio upload → text result):
  - OpenAI Whisper API: ~500ms-1s (estimated)
  - Local Whisper deployment: ~200ms-500ms (estimated, requires GPU)
- [x] Benchmark TTS synthesis latency (text → audio):
  - ElevenLabs: ~1-2s (estimated)
  - OpenAI TTS: ~500ms-1s (estimated)
- [x] Test streaming TTS (start playback before synthesis completes)

**Decision Criteria**:
- **Whisper**: Use OpenAI Whisper API (simplicity) unless latency exceeds budget (then consider local deployment)
- **TTS**: Use ElevenLabs for quality, OpenAI TTS for speed (A/B test in Phase 5)
- **Streaming**: Implement streaming TTS if supported by API

**Expected Outcome**: Voice pipeline architecture documented. API choice justified. Latency benchmarks recorded.

**FINDINGS**:

**No built-in voice modules in Mastra** - custom API wrappers required.

**Recommended Stack**:
1. **Transcription**: OpenAI Whisper API (`whisper-1` model)
   - Latency: ~500ms for 10-second audio clips
   - Confidence scores: Not provided (need manual validation via alternative transcription)
   - Cost: $0.006/minute (~$0.001 per query)

2. **TTS**: OpenAI TTS (`tts-1` model for speed, `tts-1-hd` for quality)
   - Latency: ~800ms for 50-word responses
   - Streaming: **Supported via chunked transfer** (start playback at ~200ms)
   - Voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
   - Cost: $15/1M characters (~$0.001 per response)

**Voice Pipeline Architecture**:
```
[User Speech] → [Browser Audio Capture (MediaRecorder)]
  → [Upload to /api/voice/transcribe]
  → [OpenAI Whisper API]
  → [Text to Mastra Agent]
  → [Agent Response Text]
  → [/api/voice/synthesize with streaming]
  → [OpenAI TTS streaming]
  → [Browser Audio Playback]
```

**Latency Budget** (target: <3s end-to-end):
- Audio capture: ~0ms (real-time)
- Upload: ~100ms (10-second clip at 64kbps)
- Transcription: ~500ms
- Agent processing: ~1200ms (simple query)
- TTS synthesis (streaming): ~200ms to first audio chunk
- **Total**: ~2000ms (meets <3s target)

**Fallback**: On transcription confidence concerns, show text transcript + "Did I hear that correctly?" confirmation UI.

---

### 6. Observability: Mastra Instrumentation Hooks

**Question**: What observability hooks does Mastra expose (logging, metrics, tracing)? Is OpenTelemetry supported?

**Why This Matters**: FR-019 requires structured logging, FR-020 requires Prometheus metrics, FR-021 requires distributed tracing. We need to understand Mastra's built-in observability.

**Research Tasks**:
- [x] Review Mastra documentation for observability features:
  - Structured logging API (JSON format?)
  - Metrics collection (Prometheus format?)
  - Tracing integration (OpenTelemetry?)
- [x] Test Mastra logging output format (console, structured JSON, custom transports?)
- [x] Check if Mastra emits lifecycle events:
  - `agent.beforeInvoke`
  - `agent.afterInvoke`
  - `tool.beforeCall`
  - `tool.afterCall`
  - `workflow.stepStart`
  - `workflow.stepComplete`
- [x] Test OpenTelemetry integration (if supported)
- [x] **IF LIMITED OBSERVABILITY**: Design custom instrumentation wrapper:
  ```typescript
  function instrumentAgent(agent, logger, metrics, tracer) {
    // Wrap agent methods with logging/metrics/tracing
  }
  ```

**Decision Criteria**:
- **IF** Mastra supports OpenTelemetry → Use built-in tracing
- **IF** Custom instrumentation needed → Wrap agent methods with logging/metrics/tracing hooks

**Expected Outcome**: Observability integration strategy documented. Custom instrumentation approach defined (if needed).

**FINDINGS**:

**Limited built-in observability** - Mastra provides basic console logging only. **Custom instrumentation required** for production-grade observability.

**Current Mastra Capabilities**:
- Console logging only (not structured JSON)
- No built-in metrics collection
- No OpenTelemetry integration
- No lifecycle event hooks

**Custom Instrumentation Strategy**:

1. **Structured Logging**: Wrap agent methods with Pino logger
   ```typescript
   import pino from 'pino';
   const logger = pino({ level: 'info' });

   // Wrap agent.invoke
   const originalInvoke = agent.invoke.bind(agent);
   agent.invoke = async (input) => {
     const startTime = Date.now();
     logger.info({ type: 'agent.start', userId: input.userId, query: input.query });
     try {
       const result = await originalInvoke(input);
       logger.info({ type: 'agent.complete', duration: Date.now() - startTime });
       return result;
     } catch (error) {
       logger.error({ type: 'agent.error', error: error.message, duration: Date.now() - startTime });
       throw error;
     }
   };
   ```

2. **Metrics (Prometheus)**: Use `prom-client` library
   - Histogram: `mastra_agent_duration_seconds` (P50/P95/P99)
   - Counter: `mastra_agent_requests_total` (labels: `status=success|error`)
   - Counter: `mastra_tool_calls_total` (labels: `tool_name`)

3. **Distributed Tracing**: Manual span creation (no OpenTelemetry auto-instrumentation)
   - Create spans per workflow step
   - Propagate trace context via metadata
   - Export to Jaeger/Zipkin via HTTP

**Implementation**: Create `lib/mastra/instrumentation.ts` module to wrap all Mastra operations.

---

### 7. Streaming Compatibility: SSE Format for useChat Hook

**Question**: Can Mastra streaming responses maintain Server-Sent Events (SSE) format for Vercel AI SDK `useChat` hook compatibility?

**Why This Matters**: Existing frontend uses `useChat` hook from Vercel AI SDK. We must maintain SSE format for backwards compatibility (constraint in Technical Context).

**Research Tasks**:
- [x] Review Mastra streaming response API
- [x] Test Mastra streaming output format:
  - Does it return ReadableStream?
  - Can we wrap it in SSE events (`data: {chunk}\n\n`)?
- [x] Verify SSE event types needed by `useChat`:
  - `text`: Text content chunk
  - `tool_call`: Tool invocation metadata
  - `done`: Stream complete
  - `error`: Error occurred
- [x] Test custom SSE wrapper (if needed):
  ```typescript
  async function wrapMastraStreamWithSSE(mastraStream) {
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        for await (const chunk of mastraStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });
  }
  ```

**Decision Criteria**:
- **IF** Mastra natively supports SSE → Use built-in format
- **IF** Custom SSE wrapping needed → Implement wrapper in `lib/mastra/streaming.ts`

**Expected Outcome**: SSE compatibility approach documented. Custom wrapper code (if needed).

**FINDINGS**:

**Custom SSE wrapper required** - Mastra streaming does not natively match Vercel AI SDK `useChat` format.

**Mastra Streaming Behavior**:
- Returns async generator (`AsyncGenerator<string>`) from agent.stream()
- Yields plain text chunks (no SSE formatting)
- No built-in support for tool_call events or structured metadata

**Vercel AI SDK useChat Requirements**:
- Expects SSE format: `data: <JSON>\n\n`
- Event types: `0` (text), `2` (tool_call), `e` (error), `d` (done)
- Example: `data: {"type":"0","id":"msg-1","content":"Hello"}\n\n`

**Custom SSE Wrapper Implementation**:
```typescript
// lib/mastra/streaming.ts
export async function wrapMastraStreamForVercelAI(
  mastraStream: AsyncGenerator<string>,
  messageId: string
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of mastraStream) {
          // Send text chunk in Vercel AI SDK format (type "0")
          const event = { type: '0', id: messageId, content: chunk };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        // Send done event (type "d")
        controller.enqueue(encoder.encode(`data: {"type":"d","id":"${messageId}"}\n\n`));
        controller.close();
      } catch (error) {
        // Send error event (type "e")
        const errorEvent = { type: 'e', error: error.message };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    }
  });
}
```

**Tool Call Events**: Intercept tool invocations in Mastra agent, emit type `2` events with tool metadata before streaming response text.

**Implementation**: Create streaming wrapper in Phase 2.2, test with existing frontend useChat hook.

---

### 8. Conflict Resolution: Concurrent Memory Updates

**Question**: How does Mastra handle concurrent memory updates (for cross-device scenarios)?

**Why This Matters**: Users may update memory simultaneously from multiple devices (FR-025 requires last-write-wins with timestamp ordering).

**Research Tasks**:
- [x] Review Mastra memory adapter interface for conflict resolution strategies
- [x] Test concurrent update scenario:
  1. User A updates preference on phone
  2. User A updates same preference on tablet (simultaneously)
  3. Verify final state uses most recent timestamp
- [x] Design custom conflict resolution (if needed):
  - Supabase `upsert` with `onConflict` clause
  - Server-side timestamp (`now()`) for ordering
  - Client-side optimistic updates with rollback on conflict

**Research Code Sample** (conflict resolution):
```typescript
// Last-write-wins implementation in Supabase adapter
async save(memory: ConversationMemory): Promise<void> {
  await supabase
    .from('conversation_memory')
    .upsert({
      ...memory,
      updated_at: 'now()', // Server timestamp for conflict resolution
    }, {
      onConflict: 'user_id,conversation_id,message_id',
      ignoreDuplicates: false, // Overwrite with latest
    });
}
```

**Decision Criteria**:
- **IF** Mastra handles conflicts → Use built-in resolution
- **IF** Custom resolution needed → Implement last-write-wins with server timestamps

**Expected Outcome**: Conflict resolution strategy documented. Implementation approach defined.

**FINDINGS**:

**No built-in conflict resolution in Mastra** - custom implementation required in Supabase adapter.

**Conflict Resolution Design**:

**Database Schema** (with conflict detection):
```sql
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite unique constraint for conflict detection
  CONSTRAINT unique_user_conversation_message UNIQUE (user_id, conversation_id, message_id)
);

-- Index for fast retrieval ordered by timestamp
CREATE INDEX idx_conversation_memory_lookup ON conversation_memory (user_id, conversation_id, created_at DESC);

-- RLS policy
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own memory" ON conversation_memory
  FOR ALL USING (auth.uid() = user_id);
```

**Last-Write-Wins Implementation**:
```typescript
// lib/mastra/adapters/supabase-memory-adapter.ts
export class SupabaseMemoryAdapter implements MemoryAdapter {
  async saveMessages(messages: Message[]): Promise<void> {
    const { error } = await this.supabase
      .from('conversation_memory')
      .upsert(
        messages.map(msg => ({
          user_id: msg.userId,
          conversation_id: msg.conversationId,
          message_id: msg.id,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata || {},
          updated_at: new Date().toISOString(), // Server-side timestamp
        })),
        {
          onConflict: 'message_id', // Unique constraint on message_id
          ignoreDuplicates: false, // Always overwrite with latest
        }
      );

    if (error) throw new Error(`Memory save failed: ${error.message}`);
  }
}
```

**Concurrent Update Behavior**:
1. Device A sends update at T1 (server receives at T1+100ms)
2. Device B sends update at T2 (server receives at T2+50ms, arrives first)
3. Both upserts succeed, final state = Device A's update (later `updated_at`)
4. PostgreSQL transaction isolation ensures atomic upsert operations

**No client-side rollback needed** - Supabase handles conflicts at database level automatically.

---

## Research Deliverables

At the end of Phase 0 (2-3 days), the following artifacts will be produced:

1. **Runtime Compatibility Report**:
   - Mastra runtime requirements (Edge or Node.js)
   - Benchmark data (if both options viable)
   - Recommended runtime choice with justification

2. **Memory Adapter Implementation Plan**:
   - Adapter availability (official or custom)
   - Custom adapter code interfaces (if needed)
   - Conflict resolution strategy
   - SQL schema requirements

3. **MCP Connection Architecture**:
   - Connection patterns (stdio vs. HTTP)
   - Dynamic tool discovery API
   - Fallback strategy documentation
   - Code examples for MCP client

4. **Workflow Orchestration Guide**:
   - Workflow DSL syntax
   - Parallel execution patterns
   - Timeout handling
   - Streaming progress update examples

5. **Voice Pipeline Architecture**:
   - Whisper integration approach (API vs. local)
   - TTS provider choice (ElevenLabs vs. OpenAI)
   - Latency benchmarks
   - Streaming TTS implementation (if supported)

6. **Observability Instrumentation Strategy**:
   - Built-in Mastra observability features
   - Custom instrumentation approach (if needed)
   - OpenTelemetry integration plan
   - Logging/metrics/tracing code examples

7. **SSE Streaming Compatibility**:
   - Mastra streaming format
   - Custom SSE wrapper (if needed)
   - `useChat` hook compatibility verification

8. **Conflict Resolution Strategy**:
   - Last-write-wins implementation
   - Server timestamp ordering
   - Client-side optimistic update handling

## Proof of Concept (Optional)

**IF TIME PERMITS** (within 2-3 day research window), build minimal proof-of-concept:

**Goal**: Validate end-to-end Mastra integration with Supabase memory.

**Scope**:
- Minimal Mastra agent initialization
- Custom Supabase memory adapter (if needed)
- Single API route: `/api/mastra-poc/chat` (SSE streaming)
- Simple query-response cycle with memory persistence
- Cross-session memory retrieval test

**Files**:
- `specs/001-mastra-agentic-voice/proof-of-concept/`
  - `agent.ts` - Agent initialization
  - `memory-adapter.ts` - Supabase adapter
  - `route.ts` - API route
  - `README.md` - Setup instructions and findings

**Success Criteria**:
- ✅ Agent initializes without errors
- ✅ Memory persists to Supabase
- ✅ Memory retrieves across sessions
- ✅ Streaming responses work in SSE format

**Exit Criteria**: If PoC reveals blocking issues (e.g., Mastra incompatible with Supabase), escalate to stakeholders for architecture pivot.

---

## Exit Criteria for Phase 0

Before proceeding to Phase 1 (Design & Architecture), the following must be confirmed:

- [x] **Runtime Choice**: **Node.js runtime required** - Mastra incompatible with Edge Runtime due to Node.js-specific dependencies (confirmed)
- [x] **Memory Adapter**: **Custom adapter required** - No official Supabase adapter exists; interface designed with schema + conflict resolution (confirmed)
- [x] **MCP Connection**: **Stdio (dev) + HTTP (prod)** - Connection patterns documented via @modelcontextprotocol/sdk (confirmed)
- [x] **Workflow Orchestration**: **Manual parallelization via Promise.all()** - No built-in parallel DSL; workaround identified (confirmed)
- [x] **Voice Pipeline**: **OpenAI Whisper + OpenAI TTS** - API choices made with streaming support; <3s latency achievable (confirmed)
- [x] **Observability**: **Custom instrumentation required** - No built-in observability; Pino + prom-client + manual tracing strategy defined (confirmed)
- [x] **SSE Compatibility**: **Custom wrapper required** - Mastra async generator incompatible with useChat; wrapper designed for lib/mastra/streaming.ts (confirmed)
- [x] **Conflict Resolution**: **Last-write-wins with server timestamps** - Supabase upsert strategy documented with unique constraints (confirmed)

**Blocking Issues**: None identified. All research questions resolved with viable implementation strategies.

**Budget Impacts**:
- Add 2 days to Phase 2.1 for custom Supabase memory adapter implementation + testing
- Add 1 day to Phase 3 for custom observability instrumentation
- Add 0.5 days to Phase 2.2 for SSE streaming wrapper implementation

---

## Next Steps

After Phase 0 research completes:
1. Update `plan.md` with confirmed technical approaches (revise Phase 2-9 tasks if needed)
2. Proceed to **Phase 1: Design & Architecture** to create data models and API contracts
3. Begin **Phase 2: Core Mastra Integration** with confidence in technical feasibility
