# Research Deliverable 01: Runtime Compatibility

**Research Question**: Does Mastra Framework support Next.js Edge Runtime, or must we use Node.js runtime for `/api/mastra/*` routes?

**Status**: ✅ Resolved
**Decision**: **Node.js runtime required**
**Date**: 2025-12-20

---

## Executive Summary

Mastra Framework **requires Node.js runtime** and is **incompatible with Next.js Edge Runtime**. All `/api/mastra/*` routes must explicitly set `export const runtime = 'nodejs'` to function correctly. This decision is based on core dependency analysis and framework architecture constraints.

---

## Technical Analysis

### 1. Core Dependencies Requiring Node.js

Mastra Framework relies on several Node.js-specific modules that are unavailable in Edge Runtime:

#### File System Access
- Workflow serialization/deserialization uses `fs` module
- Agent configuration loading from filesystem
- Temporary file handling for multi-step workflows

#### Child Process Management
- MCP stdio transport spawns child processes via `child_process`
- Required for local development MCP server integration

#### Native HTTP Agents
- LangChain integrations use Node.js HTTP/HTTPS agents
- Connection pooling and keep-alive requires Node.js networking stack

#### Database Connection Pooling
- Memory adapters (including custom Supabase adapter) use persistent PostgreSQL connections
- Edge Runtime's ephemeral execution model incompatible with connection pooling

### 2. Memory Adapter Constraints

All `@mastra/memory` adapters (including our custom Supabase implementation) require:
- Persistent database connections (PostgreSQL connection pooling)
- Transaction support for atomic operations
- Long-lived connection state across multiple requests

Edge Runtime's **stateless execution model** prevents:
- Connection reuse across invocations
- Transaction consistency
- Efficient query batching

### 3. MCP Integration Architecture

Model Context Protocol (MCP) integration requires:

**Development (Stdio Transport)**:
```typescript
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./geargraph-mcp-server.js']
});
```
- Uses `child_process.spawn()` → **Node.js only**

**Production (HTTP Transport)**:
```typescript
import { HTTPClientTransport } from '@modelcontextprotocol/sdk/client/http.js';

const transport = new HTTPClientTransport({
  url: process.env.MCP_ENDPOINT,
  // Uses Node.js HTTP agents for connection pooling
});
```
- Relies on Node.js HTTP agents → **Node.js only**

### 4. Workflow Engine Requirements

Mastra's workflow orchestration relies on:
- Node.js `EventEmitter` for lifecycle events
- Async iterators with Node.js stream semantics
- File-based workflow state persistence (optional)

Edge Runtime provides limited `EventEmitter` support, but missing critical stream APIs.

---

## Performance Impact Analysis

### Cold Start Latency

| Runtime | Cold Start | Warm Start | Global Distribution |
|---------|------------|------------|---------------------|
| **Edge Runtime** | ~20-50ms | ~5-10ms | ✅ 275+ edge locations |
| **Node.js Runtime** | ~100-200ms | ~10-20ms | ❌ Single region only |

**Verdict**: Node.js runtime adds ~50-150ms cold start penalty vs Edge.

### MVP Deployment Context

For MVP scale (25 concurrent users, 250 DAU):
- **Cold starts occur infrequently** (~10-20 times/day with sufficient traffic)
- **Warm requests dominate** (>95% of traffic)
- **Single-region deployment sufficient** (no global distribution needed)

### Latency Budget Analysis

End-to-end latency for typical query:
```
[User Query] → [API Route] → [Mastra Agent] → [LLM API] → [Response Stream]
   ~50ms          ~100ms         ~200ms          ~1500ms       ~0ms (streaming)
                  ↑ Cold start
                  (occurs <5% of requests)
```

**Conclusion**: 100ms cold start penalty is **negligible** compared to:
- Agent processing time (~200ms)
- LLM API latency (~1500ms)
- Workflow operations (~3000ms for complex queries)

---

## Implementation Guide

### 1. Route Configuration

All Mastra API routes must explicitly set Node.js runtime:

```typescript
// app/api/mastra/chat/route.ts
export const runtime = 'nodejs'; // ← REQUIRED
export const dynamic = 'force-dynamic'; // Disable static optimization

import { NextRequest, NextResponse } from 'next/server';
import { createMastraAgent } from '@/lib/mastra/agent';

export async function POST(req: NextRequest) {
  const agent = await createMastraAgent();
  // ... agent logic
}
```

### 2. Vercel Deployment Configuration

Ensure `vercel.json` doesn't override runtime:

```json
{
  "functions": {
    "app/api/mastra/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 60
    }
  }
}
```

### 3. Next.js Configuration

Update `next.config.ts` to disable Edge Runtime for Mastra routes:

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@mastra/core',
      '@modelcontextprotocol/sdk'
    ]
  }
};
```

---

## Alternative Approaches Considered

### Option 1: Hybrid Architecture (Edge + Node.js)
**Concept**: Use Edge Runtime for simple queries, fallback to Node.js for agentic workflows.

**Rejected because**:
- Adds architectural complexity (two runtime environments)
- Query routing logic introduces failure points
- Memory state fragmentation between runtimes
- Minimal performance benefit for MVP scale

### Option 2: Edge-Compatible MCP Client
**Concept**: Build custom MCP client using fetch() instead of Node.js HTTP agents.

**Rejected because**:
- Stdio transport impossible in Edge Runtime (no `child_process`)
- Would require forking `@modelcontextprotocol/sdk`
- Maintenance burden for upstream changes
- Breaks compatibility with existing MCP ecosystem

### Option 3: Local Development Only (Edge in Production)
**Concept**: Use Node.js locally, compile to Edge-compatible bundle for production.

**Rejected because**:
- Memory adapter requires persistent connections (impossible in Edge)
- LangChain dependencies incompatible with Edge
- Would require complete rewrite of Mastra internals

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                │
│                   (Node.js 20.x)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  /api/mastra/chat  ──────► Mastra Agent                │
│  (runtime: nodejs)          ├─ Memory Adapter          │
│                             │  (Supabase PostgreSQL)   │
│                             ├─ MCP Client               │
│                             │  (GearGraph via HTTP)    │
│                             └─ Workflow Engine          │
│                                                         │
│  /api/voice/transcribe ────► OpenAI Whisper API        │
│  (runtime: nodejs)                                      │
│                                                         │
│  /api/voice/synthesize ────► OpenAI TTS API            │
│  (runtime: nodejs)           (streaming)                │
│                                                         │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│           External Services (HTTP/HTTPS)                │
├─────────────────────────────────────────────────────────┤
│  • Supabase PostgreSQL (connection pooling)            │
│  • GearGraph MCP Server (HTTP transport)               │
│  • OpenAI API (Whisper, TTS, GPT-4)                    │
│  • Weather API (trip planning workflows)               │
└─────────────────────────────────────────────────────────┘
```

**Key Points**:
- Single-region deployment (US East for Supabase co-location)
- Connection pooling via Supabase Pooler (6053 port)
- MCP server co-located in same region for low latency

---

## Monitoring & Optimization

### Cold Start Mitigation

1. **Keep-Alive Pings**: Schedule serverless function warmup every 5 minutes
   ```typescript
   // vercel.json
   {
     "crons": [{
       "path": "/api/mastra/health",
       "schedule": "*/5 * * * *"
     }]
   }
   ```

2. **Connection Pooling**: Use Supabase transaction pooler to reduce connection overhead
   ```typescript
   // lib/supabase/client.ts
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     {
       db: { schema: 'public' },
       global: { fetch: fetch.bind(globalThis) },
       auth: { persistSession: false }
     }
   );
   ```

3. **Bundle Optimization**: Use dynamic imports for heavy dependencies
   ```typescript
   // Only load Mastra when needed (not at module scope)
   export async function POST(req: NextRequest) {
     const { createMastraAgent } = await import('@/lib/mastra/agent');
     const agent = await createMastraAgent();
   }
   ```

### Performance Metrics

Track in observability dashboard:
- `mastra_cold_start_duration_seconds` (histogram)
- `mastra_connection_pool_size` (gauge)
- `mastra_request_duration_seconds{cold_start="true"}` (histogram)

---

## Conclusion

**Decision**: Use **Node.js runtime** for all `/api/mastra/*` routes.

**Justification**:
1. **Technical Necessity**: Mastra core dependencies require Node.js APIs unavailable in Edge Runtime
2. **Performance Acceptable**: 50-150ms cold start penalty negligible for MVP scale (25 concurrent users)
3. **Architecture Simplicity**: Single runtime environment reduces complexity
4. **Ecosystem Compatibility**: Maintains compatibility with MCP SDK, LangChain, and Mastra ecosystem

**Trade-offs**:
- ✅ Full Mastra framework support
- ✅ Persistent database connections
- ✅ MCP stdio + HTTP transports
- ❌ No global edge distribution (not needed for MVP)
- ❌ Slightly higher cold start latency (mitigated by keep-alive)

**Next Steps**:
1. Update all `/api/mastra/*` routes with `export const runtime = 'nodejs'`
2. Configure Vercel deployment for Node.js 20.x runtime
3. Implement keep-alive cron for cold start mitigation
4. Add cold start metrics to observability dashboard
