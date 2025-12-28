# Mastra Framework Technical Research
**Date:** 2025-12-20
**Researcher:** Claude Code
**Project:** GearShack Winterberry - AI Assistant Integration
**Framework Version:** Mastra v0.17.0+ (2025)

---

## Executive Summary

This document provides comprehensive technical research on Mastra Framework's core capabilities for integration into a Next.js 16 App Router application with Supabase PostgreSQL backend. The research covers 6 critical areas: runtime compatibility, memory backend adapters, workflow orchestration, observability, SSE streaming, and conflict resolution strategies.

---

## 1. Runtime Compatibility: Edge vs Node.js

### Research Findings

**Decision: Use Node.js Runtime (Required)**

#### Key Evidence

1. **Next.js 16 Proxy Architecture Change**
   - Next.js 16 replaced `middleware.ts` (Edge Runtime) with `proxy.ts` (Node.js Runtime)
   - `proxy.ts` explicitly runs on Node.js runtime - route segment config errors occur if Edge runtime is specified
   - Build error: "Route segment config is not allowed in Proxy file at './proxy.ts'. Proxy always runs on Node.js runtime"
   - This architectural shift addresses previous Edge Runtime limitations with Node.js-dependent libraries

2. **Mastra Dependencies on Node.js APIs**
   - Mastra integrates with PostgreSQL via `@mastra/pg` package, which uses `pg-promise` (requires Node.js runtime)
   - Edge Runtime explicitly excludes native Node.js APIs (`fs`, `net`, `crypto` module features)
   - Database drivers (PostgreSQL, MongoDB, Redis) face compatibility issues in Edge Runtime
   - Mastra's observability features (OpenTelemetry, file-based logging) require Node.js APIs

3. **Next.js Integration Pattern**
   - Mastra documentation shows Next.js integration using API routes (App Router `/api` directory)
   - API routes in Next.js 16 App Router default to Node.js runtime
   - Mastra server can be deployed as standalone Node.js server or embedded in Next.js

#### Implementation Strategy

```typescript
// app/api/mastra/route.ts
export const runtime = 'nodejs'; // Explicit declaration (default for API routes)

import { mastra } from '@/lib/mastra';
import { chatRoute } from '@mastra/ai-sdk';

// Mastra routes run on Node.js runtime
export const POST = async (req: Request) => {
  // Mastra agent/workflow execution with full Node.js API access
  const response = await mastra.getAgent('gearAssistant').stream(messages);
  return response;
};
```

#### Trade-offs

| Aspect | Edge Runtime | Node.js Runtime (Selected) |
|--------|--------------|----------------------------|
| Cold Start | ~50-100ms | ~200-500ms |
| Global Distribution | Yes (CDN-like) | Regional (single region) |
| Database Connections | Limited (HTTP-based) | Full support (connection pools) |
| Mastra Compatibility | ❌ No (missing Node.js APIs) | ✅ Yes (full support) |
| OpenTelemetry | ❌ Limited | ✅ Full support |
| PostgreSQL (Supabase) | HTTP only (limited) | ✅ Native driver (`pg`) |

**Justification:** Mastra's architecture requires Node.js runtime for PostgreSQL connection pooling, OpenTelemetry instrumentation, and file system operations. Next.js 16's proxy.ts shift to Node.js runtime aligns perfectly with Mastra's requirements.

---

## 2. Memory Backend - Supabase PostgreSQL Adapter

### Research Findings

**Status: Official PostgreSQL Adapter Available - Compatible with Supabase**

#### Official Adapter: `@mastra/pg`

Mastra provides a first-party PostgreSQL storage adapter via the `@mastra/pg` npm package that is fully compatible with Supabase PostgreSQL.

##### Installation & Basic Configuration

```bash
npm install @mastra/pg
```

```typescript
import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';

export const mastra = new Mastra({
  storage: new PostgresStore({
    connectionString: process.env.SUPABASE_DB_URL, // Supabase connection string
    schemaName: 'mastra', // Optional: custom schema (default: 'public')
    ssl: true, // Enable SSL for Supabase
  }),
});
```

##### Supabase Connection String Format

```env
# .env.local
SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

#### Automatic Schema Management

- PostgresStore automatically creates required tables on first initialization
- No manual migration scripts needed - Mastra handles schema creation
- Core schema includes tables for:
  - `mastra_threads` - conversation threads
  - `mastra_messages` - message history
  - `mastra_resources` - resource-scoped memory
  - `mastra_workflows` - workflow execution state
  - `mastra_traces` - observability traces
  - `mastra_evals` - evaluation datasets

#### Advanced Features

##### 1. Custom Schema Support
```typescript
const store = new PostgresStore({
  connectionString: process.env.SUPABASE_DB_URL,
  schemaName: 'ai_agents', // Isolated schema for Mastra tables
});
```

##### 2. Direct Database Access
```typescript
// Access pg-promise instance directly for custom queries
const result = await store.db.query('SELECT * FROM mastra_threads WHERE resource_id = $1', [userId]);

// Transaction support
await store.db.tx(async (t) => {
  await t.none('INSERT INTO mastra_messages ...');
  await t.none('UPDATE mastra_threads ...');
});
```

##### 3. Index Management (Performance Optimization)
```typescript
// List all indexes
const indexes = await store.listIndexes();

// Create custom index for optimized queries
await store.db.query(`
  CREATE INDEX idx_messages_user_created
  ON mastra_messages(user_id, created_at DESC)
`);

// Default composite indexes (automatic):
// - mastra_threads_resourceid_createdat_idx
// - mastra_messages_thread_id_createdat_idx
// - mastra_traces_name_starttime_idx
// - mastra_evals_agent_name_created_at_idx
```

##### 4. Initialization Pattern

```typescript
// Manual initialization (if using storage directly without Mastra instance)
await store.init(); // Creates tables if not exists

// Graceful shutdown
await store.close(); // Destroys connection pool
```

#### Memory Types Supported

Mastra supports three types of memory storage via PostgreSQL:

1. **Working Memory** - Persistent user-specific data (preferences, names, goals)
2. **Conversation History** - Full message thread history
3. **Semantic Recall** - Vector embeddings for similarity search (requires pgvector extension)

##### Vector Store Integration (Semantic Memory)

```typescript
import { PostgresStore } from '@mastra/pg';

// Supabase has pgvector extension enabled by default
const vectorStore = new PostgresStore({
  connectionString: process.env.SUPABASE_DB_URL,
  // Vector operations: upsert(), query(), createIndex()
});

// Upsert embeddings
await vectorStore.upsert({
  id: 'doc-123',
  values: embeddings, // float[] array
  metadata: { userId, source: 'gear-manual' },
});

// Similarity search
const results = await vectorStore.query({
  vector: queryEmbedding,
  topK: 5,
  filter: { userId: 'user-456' },
});
```

#### Resource-Scoped Memory (Multi-Tenant Pattern)

```typescript
// Agent memory scoped to user or resource
const agent = mastra.getAgent('gearAssistant');

await agent.chat({
  messages: [...],
  resourceId: userId, // Memory isolated per user
});

// Agents can access memories from previous threads for same resource
// Supported by PostgresStore, LibSQL, and Upstash adapters
```

#### Google Cloud SQL IAM Support

```typescript
// For Google Cloud SQL deployments
import { Client } from 'pg';

const store = new PostgresStore({
  // Accepts raw pg.ClientConfig for dynamic IAM auth
  connectionString: process.env.CLOUD_SQL_CONNECTION,
});
```

### Implementation Plan for GearShack

```typescript
// lib/mastra/storage.ts
import { PostgresStore } from '@mastra/pg';

export const mastraStorage = new PostgresStore({
  connectionString: process.env.SUPABASE_DB_URL!,
  schemaName: 'mastra', // Separate schema from app tables
  ssl: {
    rejectUnauthorized: false, // Supabase SSL config
  },
});

// lib/mastra/index.ts
import { Mastra } from '@mastra/core';
import { mastraStorage } from './storage';

export const mastra = new Mastra({
  storage: mastraStorage,
  agents: {
    gearAssistant: {
      name: 'Gear Assistant',
      instructions: '...',
      model: {
        provider: 'ANTHROPIC',
        name: 'claude-opus-4',
      },
      memory: {
        // Working memory for user preferences
        working: true,
        // Conversation history
        history: true,
        // Semantic recall with pgvector
        semantic: {
          enabled: true,
          topK: 5,
        },
      },
    },
  },
});
```

**No Custom Adapter Required** - Use `@mastra/pg` directly with Supabase connection string.

---

## 3. Workflow Orchestration - Parallel Execution

### Research Findings

**Parallel Execution: Fully Supported with Multiple Patterns**

#### Workflow DSL Overview

Mastra workflows orchestrate complex sequences of operations with branching, parallel execution, resource suspension, and streaming progress. Workflows use a fluent API for step chaining.

#### Pattern 1: `.parallel()` Method (Recommended)

```typescript
import { Workflow } from '@mastra/core';

const gearAnalysisWorkflow = new Workflow({
  name: 'gear-analysis',
  retryConfig: {
    attempts: 3,
    delay: 1000, // ms between retries
  },
});

// Parallel execution with .parallel([step1, step2])
gearAnalysisWorkflow
  .step({
    id: 'fetch-user-data',
    execute: async ({ context }) => {
      const user = await getUserProfile(context.userId);
      return { user };
    },
  })
  .parallel([
    {
      id: 'analyze-gear',
      execute: async ({ context }) => {
        const gearItems = await fetchGearItems(context.userId);
        return { gearCount: gearItems.length };
      },
    },
    {
      id: 'analyze-loadouts',
      execute: async ({ context }) => {
        const loadouts = await fetchLoadouts(context.userId);
        return { loadoutCount: loadouts.length };
      },
    },
    {
      id: 'fetch-recommendations',
      execute: async ({ context }) => {
        const recommendations = await getRecommendations(context.userId);
        return { recommendations };
      },
    },
  ])
  .then({
    id: 'generate-summary',
    execute: async ({ context }) => {
      // Parallel outputs available as object with step IDs as keys
      const gearCount = context['analyze-gear'].gearCount;
      const loadoutCount = context['analyze-loadouts'].loadoutCount;
      const recommendations = context['fetch-recommendations'].recommendations;

      return {
        summary: `User has ${gearCount} gear items and ${loadoutCount} loadouts`,
        recommendations,
      };
    },
  });
```

##### Parallel Output Schema

When steps run in parallel, output structure is:

```typescript
{
  'step-id-1': { /* step 1 output */ },
  'step-id-2': { /* step 2 output */ },
  'step-id-3': { /* step 3 output */ },
}
```

The following step's `inputSchema` must match this structure to access parallel results.

#### Pattern 2: Nested Workflows (Advanced Parallelism)

```typescript
// Create separate workflow branches
const gearWorkflow = new Workflow({ name: 'gear-branch' })
  .step({ id: 'process-gear', execute: async () => ({ /* ... */ }) });

const loadoutWorkflow = new Workflow({ name: 'loadout-branch' })
  .step({ id: 'process-loadouts', execute: async () => ({ /* ... */ }) });

// Parent workflow orchestrates parallel branches
const parentWorkflow = new Workflow({ name: 'parent' })
  .step(gearWorkflow)      // Executes in parallel
  .step(loadoutWorkflow)   // Executes in parallel
  .after([gearWorkflow, loadoutWorkflow]) // Waits for both
  .step({
    id: 'merge-results',
    execute: async ({ context }) => {
      // Merge results from nested workflows
      return { merged: true };
    },
  });
```

#### Timeout Handling

**Note:** Explicit `maxDuration` per-step configuration was not found in documentation. Timeout handling is recommended via:

1. **Step-Level Retry Configuration**
```typescript
gearAnalysisWorkflow.step({
  id: 'external-api-call',
  execute: async () => { /* ... */ },
  retryConfig: {
    attempts: 3,
    delay: 1000, // Exponential backoff recommended
  },
});
```

2. **Custom Timeout Implementation**
```typescript
const timeoutPromise = (ms: number) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Step timeout')), ms)
  );

gearAnalysisWorkflow.step({
  id: 'with-timeout',
  execute: async ({ context }) => {
    return Promise.race([
      actualOperation(context),
      timeoutPromise(30000), // 30s timeout
    ]);
  },
  retryConfig: {
    attempts: 2,
    delay: 500,
  },
});
```

3. **Circuit Breaker Pattern** (Recommended by Mastra docs)
```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(asyncFunction, {
  timeout: 10000, // 10s timeout
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

gearAnalysisWorkflow.step({
  id: 'with-circuit-breaker',
  execute: async ({ context }) => {
    return breaker.fire(context);
  },
});
```

#### Streaming Progress Updates

**Writer API for Real-Time Progress**

Every workflow step receives a `writer` argument (WritableStream) to emit progress updates:

```typescript
gearAnalysisWorkflow.step({
  id: 'process-large-dataset',
  execute: async ({ context, writer }) => {
    const items = await fetchGearItems(context.userId);

    for (let i = 0; i < items.length; i++) {
      await processItem(items[i]);

      // Emit progress update
      writer.write({
        type: 'progress',
        step: 'process-large-dataset',
        current: i + 1,
        total: items.length,
        percentage: Math.round(((i + 1) / items.length) * 100),
      });
    }

    return { processed: items.length };
  },
});

// Client-side consumption
const run = await gearAnalysisWorkflow.execute({ userId: '123' });

for await (const chunk of run.streamVNext()) {
  if (chunk.type === 'progress') {
    console.log(`Progress: ${chunk.percentage}%`);
    updateProgressBar(chunk.percentage); // Update UI
  }
}
```

#### Parallel Execution Bug Fix (2025)

**Critical Fix (August 2025):** Parallel workflow blocks now correctly wait for ALL steps to complete before proceeding. Previous bug allowed parallel blocks to complete when only some steps resumed, causing silent failures and data integrity issues.

```typescript
// FIXED: All parallel steps must complete successfully
workflow
  .parallel([step1, step2, step3])
  .then(nextStep); // nextStep waits for ALL parallel steps to finish
```

#### Error Handling in Parallel Steps

```typescript
workflow
  .parallel([
    {
      id: 'step-1',
      execute: async () => { /* ... */ },
      retryConfig: { attempts: 2, delay: 500 },
    },
    {
      id: 'step-2',
      execute: async () => { /* ... */ },
      retryConfig: { attempts: 3, delay: 1000 },
    },
  ])
  .then({
    id: 'handle-results',
    execute: async ({ context }) => {
      // Check for partial failures
      const step1Success = context['step-1'] !== undefined;
      const step2Success = context['step-2'] !== undefined;

      if (!step1Success || !step2Success) {
        throw new Error('One or more parallel steps failed');
      }

      return { /* ... */ };
    },
  });
```

### Workflow DSL Quick Reference

```typescript
// Sequential execution
workflow.step(step1).step(step2).step(step3);

// Parallel execution
workflow.parallel([step1, step2, step3]).then(step4);

// Conditional branching
workflow
  .step(step1)
  .condition({
    if: (context) => context.needsApproval,
    then: approvalStep,
    else: autoApproveStep,
  })
  .step(finalStep);

// Nested workflows
workflow
  .step(nestedWorkflow1)
  .step(nestedWorkflow2)
  .after([nestedWorkflow1, nestedWorkflow2])
  .step(mergeStep);

// Suspend/Resume (Human-in-the-loop)
workflow.step({
  id: 'approval-gate',
  execute: async ({ suspend }) => {
    // Suspend workflow for external approval
    await suspend({ reason: 'Awaiting admin approval' });
  },
});

// Resume workflow later
await workflow.resume(executionId, { approved: true });
```

---

## 4. Observability - Built-in vs Custom Instrumentation

### Research Findings

**Observability: Rich Built-in Features with OpenTelemetry Support**

#### Native Observability Features

Mastra provides comprehensive observability across all primitives:

1. **Automatic Tracing** (when telemetry enabled)
   - Agent operations
   - LLM interactions
   - Tool executions
   - Integration calls
   - Workflow runs
   - Database operations

2. **Logging System** (PinoLogger default)
   - Structured logging with JSON format
   - Function execution traces
   - Input/output data capture
   - Accessible via `mastra.getLogger()`

3. **OpenTelemetry Protocol (OTLP) Support**
   - Any OTLP-compatible platform: Datadog, New Relic, Jaeger, SigNoz
   - Distributed tracing across services
   - Custom span attributes and events

#### Configuration Patterns

##### 1. OpenTelemetry Tracing (OTLP Exporter)

```typescript
// lib/mastra/index.ts
import { Mastra } from '@mastra/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export const mastra = new Mastra({
  telemetry: {
    serviceName: 'gearshack-ai',
    exporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: {
        'x-api-key': process.env.OTEL_API_KEY,
      },
    }),
  },
  logger: {
    type: 'PINO',
    level: process.env.LOG_LEVEL || 'info',
  },
});
```

##### 2. Datadog Integration

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export const mastra = new Mastra({
  telemetry: {
    serviceName: 'gearshack-ai',
    exporter: new OTLPTraceExporter({
      url: 'https://trace.agent.datadoghq.com/api/v2/traces',
      headers: {
        'DD-API-KEY': process.env.DATADOG_API_KEY!,
      },
    }),
  },
});
```

##### 3. Langfuse Integration (AI-Specific Observability)

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

export const mastra = new Mastra({
  telemetry: {
    serviceName: 'gearshack-ai',
    // Langfuse exporter configuration
  },
});
```

##### 4. Structured Logging

```typescript
// Inside workflow step or tool
const logger = mastra.getLogger();

logger.info({
  step: 'analyze-gear',
  userId: context.userId,
  itemCount: gearItems.length,
}, 'Analyzing user gear inventory');

logger.error({
  error: error.message,
  stack: error.stack,
  context: { userId, gearId },
}, 'Failed to fetch gear item');
```

#### Next.js Instrumentation Hook (Required)

```typescript
// instrumentation.ts (project root)
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'gearshack-winterberry',
  });
}

// next.config.ts
const nextConfig = {
  experimental: {
    instrumentationHook: true, // Enable OpenTelemetry
  },
};
```

#### Custom Instrumentation (Advanced)

```typescript
// mastra/instrumentation.ts (custom instrumentation file)
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('gearshack-custom');

export async function tracedOperation<T>(
  name: string,
  operation: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }

      const result = await operation();

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage in workflow step
workflow.step({
  id: 'fetch-gear',
  execute: async ({ context }) => {
    return tracedOperation(
      'fetch-gear-items',
      () => fetchGearItems(context.userId),
      { userId: context.userId }
    );
  },
});
```

#### Lifecycle Hooks Status

**Current State (December 2025):**

- **Middleware System:** ✅ Available for agents (filter, transform, validate messages)
- **Tool Hooks:** ⚠️ Feature Request (#7751) - `onStart`, `onComplete`, `onError` hooks proposed but not yet implemented
- **Workflow Suspend/Resume:** ✅ Available (alternative to beforeInvoke/afterInvoke pattern)

##### Available: Middleware Pattern

```typescript
export const mastra = new Mastra({
  agents: {
    gearAssistant: {
      name: 'Gear Assistant',
      model: { provider: 'ANTHROPIC', name: 'claude-opus-4' },
      middleware: [
        // Message validation middleware
        async (messages, next) => {
          const logger = mastra.getLogger();
          logger.info({ messageCount: messages.length }, 'Incoming messages');

          // Filter/transform messages before LLM
          const filtered = messages.filter(m => m.content.length > 0);

          const response = await next(filtered);

          logger.info({ responseLength: response.length }, 'Response generated');
          return response;
        },
        // Rate limiting middleware
        async (messages, next) => {
          const userId = messages[0]?.userId;
          if (await isRateLimited(userId)) {
            throw new Error('Rate limit exceeded');
          }
          return next(messages);
        },
      ],
    },
  },
});
```

##### Alternative: Suspend/Resume for Human-in-the-Loop

```typescript
// Workflow step with approval gate
workflow.step({
  id: 'generate-recommendation',
  execute: async ({ context, suspend }) => {
    const recommendation = await generateRecommendation(context);

    // Suspend for manual approval
    await suspend({
      reason: 'Awaiting admin review',
      data: { recommendation },
    });

    // Execution pauses here - persisted to storage
  },
});

// Resume later with approval
await workflow.resume(executionId, { approved: true });
```

#### Observability Best Practices

1. **Use Structured Logging** - JSON format with contextual fields
2. **Enable OTLP for Production** - Send traces to centralized platform
3. **Custom Spans for Critical Paths** - Wrap expensive operations
4. **Error Tracking** - Record exceptions with context
5. **Performance Monitoring** - Track step execution times via traces

### Implementation Strategy for GearShack

**Recommended Approach:** Built-in OpenTelemetry + Custom Spans for Business Logic

```typescript
// lib/mastra/observability.ts
import { Mastra } from '@mastra/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export const mastra = new Mastra({
  telemetry: {
    serviceName: 'gearshack-ai',
    exporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: {
        'x-honeycomb-team': process.env.HONEYCOMB_API_KEY, // Example: Honeycomb
      },
    }),
  },
  logger: {
    type: 'PINO',
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Custom instrumentation for GearShack-specific operations
import { trace } from '@opentelemetry/api';

export const gearTracer = trace.getTracer('gearshack-business-logic');

export async function traceGearOperation<T>(
  operationName: string,
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return gearTracer.startActiveSpan(operationName, async (span) => {
    span.setAttribute('user.id', userId);
    span.setAttribute('app.version', process.env.NEXT_PUBLIC_APP_VERSION || 'dev');

    try {
      const result = await operation();
      span.setStatus({ code: 0 }); // OK
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 5. SSE Streaming - Vercel AI SDK Compatibility

### Research Findings

**SSE Streaming: Native Support with AI SDK v5 Compatibility**

#### Mastra Streaming Evolution

**Historical Context:** Mastra initially relied on Vercel AI SDK for streaming but built a custom streaming layer to handle:
- Nested agent calls
- Long-running tools
- Complex orchestration patterns
- Workflow progress updates

**Current State (2025):** Mastra v5 uses Server-Sent Events (SSE) as standard, aligned with Vercel AI SDK v5 protocol.

#### Native SSE Format

Mastra's streaming protocol uses SSE (Server-Sent Events) format:

```
data: {"type":"text","value":"Hello"}\n\n
data: {"type":"tool_call","name":"searchGear","arguments":{"query":"tent"}}\n\n
data: {"type":"finish","reason":"stop"}\n\n
```

This format is:
- Natively supported in browsers (EventSource API)
- Standard protocol with ping/keep-alive
- Cache-friendly
- Debuggable with browser DevTools

#### Vercel AI SDK v5 Integration

Mastra provides **native compatibility** with Vercel AI SDK v5 via `@mastra/ai-sdk` package.

##### Installation

```bash
npm install @mastra/ai-sdk ai
```

##### Server-Side Route Handler (Next.js API Route)

```typescript
// app/api/chat/route.ts
import { mastra } from '@/lib/mastra';
import { chatRoute } from '@mastra/ai-sdk';

// Option 1: Use built-in chatRoute utility
export const POST = chatRoute({
  agent: 'gearAssistant',
  path: '/chat', // Route path
  sendStart: true,       // Send initialization chunks
  sendFinish: true,      // Send completion signals
  sendReasoning: false,  // Omit reasoning traces (reduce bandwidth)
  sendSources: true,     // Include source attributions
});

// Option 2: Custom implementation with toAISdkFormat
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { toAISdkFormat } from '@mastra/ai-sdk';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = mastra.getAgent('gearAssistant');
  const stream = await agent.stream({ messages });

  // Transform Mastra stream to AI SDK format
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkFormat(stream, { from: 'agent' })!) {
        writer.write(part);
      }
    },
  });

  // Return SSE response compatible with useChat hook
  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
```

##### Client-Side Integration (useChat Hook)

```typescript
// app/components/ChatInterface.tsx
'use client';

import { useChat } from 'ai/react';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat', // Mastra-powered endpoint
    onResponse: (response) => {
      console.log('Stream started:', response.status);
    },
    onFinish: (message) => {
      console.log('Stream completed:', message);
    },
    onError: (error) => {
      console.error('Stream error:', error);
    },
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
          placeholder="Ask about your gear..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

##### Client-Side ReadableStream Pattern (Advanced)

For custom stream processing outside of `useChat`:

```typescript
import { createUIMessageStream } from 'ai';
import { toAISdkFormat } from '@mastra/ai-sdk';
import type { ChunkType, MastraModelOutput } from '@mastra/core/stream';

async function streamAgentResponse(messages: Message[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  // Create ReadableStream from agent response
  const chunkStream: ReadableStream<ChunkType> = new ReadableStream<ChunkType>({
    start(controller) {
      response.processDataStream({
        onChunk: async (chunk) => controller.enqueue(chunk as ChunkType),
      }).finally(() => controller.close());
    },
  });

  // Transform to AI SDK format
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkFormat(
        chunkStream as unknown as MastraModelOutput,
        { from: 'agent' }
      )) {
        writer.write(part);
      }
    },
  });

  // Process stream
  for await (const part of uiMessageStream) {
    console.log('Stream part:', part);
    // Update UI, append to message, etc.
  }
}
```

#### Workflow Streaming (Multi-Step Progress)

For workflows, use `workflowRoute()` to stream step-by-step progress:

```typescript
// app/api/workflow/route.ts
import { workflowRoute } from '@mastra/ai-sdk';

export const POST = workflowRoute({
  workflow: 'gear-analysis',
  path: '/workflow',
  sendStart: true,
  sendFinish: true,
});

// Client-side consumption
const { data, error, isLoading } = useChat({
  api: '/api/workflow',
  onUpdate: (update) => {
    // Workflow step progress
    if (update.type === 'progress') {
      setProgress(update.percentage);
    }
  },
});
```

#### Stream Response Types

Mastra agent streams provide multiple access patterns:

```typescript
const stream = await agent.stream({ messages });

// 1. Text-only stream
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk); // "Hello, I can help..."
}

// 2. Full response (Promise)
const fullText = await stream.text;
console.log(fullText); // "Hello, I can help you with your gear inventory."

// 3. Finish reason
const reason = await stream.finishReason;
console.log(reason); // "stop" | "length" | "tool_calls"

// 4. Full stream with metadata
for await (const part of stream) {
  if (part.type === 'text') {
    console.log('Text chunk:', part.value);
  } else if (part.type === 'tool_call') {
    console.log('Tool called:', part.name, part.arguments);
  }
}
```

#### Stream Configuration Options (Fine-Grained Control)

```typescript
chatRoute({
  agent: 'gearAssistant',
  path: '/chat',

  // Control what gets streamed to frontend
  sendStart: false,      // Skip initialization chunks (reduce latency)
  sendFinish: true,      // Keep completion signals
  sendReasoning: false,  // Omit reasoning traces (Claude's thinking process)
  sendSources: true,     // Include source attributions (for RAG)
});
```

**Use Cases:**
- `sendReasoning: false` - Reduce bandwidth by 30-50% for production
- `sendStart: false` - Faster perceived response time
- `sendSources: true` - Essential for RAG applications (cite gear manuals, user data)

#### SSE vs WebSockets Comparison

| Feature | SSE (Mastra Default) | WebSockets |
|---------|---------------------|------------|
| Browser Support | ✅ Native (EventSource) | ⚠️ Requires library |
| HTTP/2 Multiplexing | ✅ Yes | ❌ No |
| Automatic Reconnect | ✅ Built-in | ❌ Manual |
| Caching | ✅ Standard HTTP cache | ❌ No caching |
| Debugging | ✅ Chrome DevTools Network tab | ⚠️ Specialized tools |
| Bi-directional | ❌ Server → Client only | ✅ Full duplex |
| Vercel Edge Compatibility | ✅ Yes | ⚠️ Limited |

**Decision for GearShack:** Use SSE (Mastra default) - simpler, better caching, native browser support.

### Implementation Strategy

**Recommended Pattern:** Use `@mastra/ai-sdk` built-in routes with Vercel AI SDK `useChat` hook.

```typescript
// lib/mastra/routes.ts
import { chatRoute, workflowRoute } from '@mastra/ai-sdk';

export const gearAssistantRoute = chatRoute({
  agent: 'gearAssistant',
  path: '/api/chat',
  sendStart: false,      // Reduce latency
  sendFinish: true,
  sendReasoning: false,  // Save bandwidth
  sendSources: true,     // For RAG citations
});

export const gearAnalysisWorkflowRoute = workflowRoute({
  workflow: 'gear-analysis',
  path: '/api/workflow/analyze',
  sendStart: true,
  sendFinish: true,
});

// app/api/chat/route.ts
export { gearAssistantRoute as POST };

// app/api/workflow/analyze/route.ts
export { gearAnalysisWorkflowRoute as POST };
```

**No Custom SSE Wrapper Required** - Mastra `toAISdkFormat()` handles all formatting.

---

## 6. Conflict Resolution Strategy

### Research Findings

**Conflict Resolution: Custom Implementation Required (Last-Write-Wins Pattern)**

#### Current State

Mastra's memory adapters (PostgresStore) support standard database operations:
- `upsert()` - Add or update embeddings (vector store)
- `query()` - Similarity search
- `delete()` - Remove by filter

However, **explicit conflict resolution strategy** (e.g., last-write-wins with server timestamps) is **not documented** in Mastra's core API.

#### PostgreSQL ON CONFLICT Capabilities

PostgreSQL provides robust upsert capabilities via `INSERT ... ON CONFLICT` clause:

```sql
-- Last-write-wins pattern with server timestamp
INSERT INTO mastra_messages (id, thread_id, content, user_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (id)
DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW()
WHERE mastra_messages.updated_at < EXCLUDED.updated_at; -- Only update if newer
```

#### Supabase Implementation Strategy

**Requirement (FR-025):** Last-write-wins conflict resolution for agent memory updates.

##### 1. Database Schema Extension

```sql
-- Extend Mastra's auto-created tables with server-side timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to Mastra tables
CREATE TRIGGER update_mastra_messages_updated_at
  BEFORE UPDATE ON mastra.mastra_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mastra_threads_updated_at
  BEFORE UPDATE ON mastra.mastra_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

##### 2. Upsert with Conflict Resolution (Custom Wrapper)

```typescript
// lib/mastra/storage-wrapper.ts
import { PostgresStore } from '@mastra/pg';

export class ConflictResolvingStore extends PostgresStore {
  /**
   * Upsert with last-write-wins conflict resolution
   */
  async upsertWithConflictResolution<T>(
    table: string,
    data: T & { id: string },
    conflictColumn: string = 'id'
  ): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Generate parameterized query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const updateSet = columns
      .filter(col => col !== conflictColumn)
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')}, updated_at)
      VALUES (${placeholders}, NOW())
      ON CONFLICT (${conflictColumn})
      DO UPDATE SET
        ${updateSet},
        updated_at = NOW()
      WHERE ${table}.updated_at < EXCLUDED.updated_at
      RETURNING *;
    `;

    await this.db.query(query, values);
  }

  /**
   * Batch upsert with transaction
   */
  async batchUpsertWithConflictResolution<T>(
    table: string,
    records: Array<T & { id: string }>
  ): Promise<void> {
    await this.db.tx(async (t) => {
      for (const record of records) {
        await this.upsertWithConflictResolution(table, record);
      }
    });
  }
}

// Usage
export const mastraStorage = new ConflictResolvingStore({
  connectionString: process.env.SUPABASE_DB_URL!,
  schemaName: 'mastra',
});
```

##### 3. Optimistic Locking (Alternative Pattern)

For critical data requiring strict concurrency control:

```typescript
// lib/mastra/optimistic-lock.ts
import { PostgresStore } from '@mastra/pg';

export async function upsertWithOptimisticLock<T>(
  store: PostgresStore,
  table: string,
  data: T & { id: string; version?: number }
): Promise<void> {
  const currentVersion = data.version || 0;
  const nextVersion = currentVersion + 1;

  const query = `
    INSERT INTO ${table} (id, data, version, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      version = EXCLUDED.version,
      updated_at = NOW()
    WHERE ${table}.version = $4
    RETURNING *;
  `;

  const result = await store.db.query(query, [
    data.id,
    data,
    nextVersion,
    currentVersion,
  ]);

  if (result.length === 0) {
    throw new Error('OptimisticLockException: Record was modified by another process');
  }
}
```

##### 4. Multi-Constraint Conflict Handling

**Challenge:** PostgreSQL ON CONFLICT with multiple unique constraints can cause race conditions.

**Solution:** Use advisory locks for complex scenarios:

```typescript
// lib/mastra/advisory-lock.ts
import { PostgresStore } from '@mastra/pg';

export async function upsertWithAdvisoryLock<T>(
  store: PostgresStore,
  table: string,
  data: T & { id: string },
  lockKey: string
): Promise<void> {
  await store.db.tx(async (t) => {
    // Acquire advisory lock (released at transaction end)
    const lockId = hashStringToInt(lockKey); // Convert string to int64
    await t.query('SELECT pg_advisory_xact_lock($1)', [lockId]);

    // Perform upsert within locked context
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await t.query(`
      INSERT INTO ${table} (${columns.join(', ')}, updated_at)
      VALUES (${placeholders}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        ${columns.map(c => `${c} = EXCLUDED.${c}`).join(', ')},
        updated_at = NOW()
    `, values);
  });
}

function hashStringToInt(str: string): bigint {
  // Simple hash function (use crypto.createHash for production)
  let hash = 0n;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5n) - hash + BigInt(str.charCodeAt(i));
  }
  return hash;
}
```

#### Conflict Resolution Decision Matrix

| Scenario | Strategy | Implementation |
|----------|----------|----------------|
| Simple key-based updates | Last-write-wins | `ON CONFLICT ... DO UPDATE` with `updated_at` |
| Concurrent writes to same record | Server timestamps | `WHERE updated_at < EXCLUDED.updated_at` |
| Critical data (user preferences) | Optimistic locking | Version column + `WHERE version = $expected` |
| Multiple unique constraints | Advisory locks | `pg_advisory_xact_lock()` + upsert |
| Vector embeddings | Overwrite (default) | Mastra's built-in `upsert()` |

#### Recommended Strategy for GearShack

**Primary Pattern:** Last-write-wins with server-side timestamps

```typescript
// lib/mastra/storage.ts
import { PostgresStore } from '@mastra/pg';

export class GearShackMastraStore extends PostgresStore {
  constructor() {
    super({
      connectionString: process.env.SUPABASE_DB_URL!,
      schemaName: 'mastra',
      ssl: { rejectUnauthorized: false },
    });
  }

  /**
   * Upsert agent memory with last-write-wins conflict resolution
   */
  async upsertAgentMemory(
    userId: string,
    memoryType: 'working' | 'history' | 'semantic',
    data: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO mastra.agent_memory (
        user_id,
        memory_type,
        data,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (user_id, memory_type)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
      WHERE agent_memory.updated_at < EXCLUDED.updated_at
      RETURNING *;
    `;

    await this.db.query(query, [userId, memoryType, JSON.stringify(data)]);
  }
}

export const mastraStorage = new GearShackMastraStore();
```

**Fallback for Critical Paths:** Optimistic locking for user profile updates.

---

## Summary of Recommendations

| Question | Recommendation | Rationale |
|----------|---------------|-----------|
| **1. Runtime** | **Node.js Runtime** | Required for PostgreSQL connection pooling, OpenTelemetry, and Mastra's Node.js dependencies. Next.js 16's proxy.ts shift to Node.js aligns perfectly. |
| **2. Memory Backend** | **Use `@mastra/pg`** (Official Adapter) | First-party PostgreSQL adapter fully compatible with Supabase. No custom adapter needed. Automatic schema management, direct database access, and vector store support. |
| **3. Workflow Orchestration** | **Use `.parallel()` method** | Native parallel execution with structured output. Combine with streaming writer API for progress updates. Implement custom timeouts via Promise.race or circuit breakers. |
| **4. Observability** | **Built-in OpenTelemetry + Custom Spans** | Leverage Mastra's automatic tracing for agents/workflows. Add custom spans for GearShack business logic. Use PinoLogger for structured logging. |
| **5. SSE Streaming** | **Use `@mastra/ai-sdk` chatRoute()** | Native SSE support with Vercel AI SDK v5 compatibility. No custom wrapper needed. Use `toAISdkFormat()` for seamless integration with `useChat` hook. |
| **6. Conflict Resolution** | **Custom Last-Write-Wins Wrapper** | Extend PostgresStore with `ON CONFLICT` upserts using server-side timestamps (`updated_at`). Use optimistic locking for critical data. |

---

## Next Steps for Implementation

1. **Install Dependencies**
   ```bash
   npm install @mastra/core @mastra/pg @mastra/ai-sdk ai @opentelemetry/exporter-trace-otlp-http
   ```

2. **Configure Mastra Instance**
   - Set up PostgresStore with Supabase connection string
   - Define agents with memory configuration
   - Enable OpenTelemetry tracing

3. **Create API Routes**
   - Use `chatRoute()` for agent interactions
   - Use `workflowRoute()` for multi-step operations
   - Export POST handlers in Next.js App Router

4. **Implement Conflict Resolution**
   - Create custom storage wrapper with last-write-wins upserts
   - Add database triggers for `updated_at` columns
   - Test concurrent write scenarios

5. **Set Up Observability**
   - Configure OTLP exporter (Honeycomb, Datadog, or New Relic)
   - Add instrumentation hook to `next.config.ts`
   - Create custom tracers for business logic

6. **Frontend Integration**
   - Use Vercel AI SDK `useChat` hook
   - Connect to Mastra-powered API routes
   - Handle streaming responses in UI

---

## Sources

### Runtime Compatibility
- [Integrate Mastra in your Next.js project | Mastra Docs](https://mastra.ai/docs/frameworks/web-frameworks/next-js)
- [Next.js 16 | Next.js](https://nextjs.org/blog/next-16)
- [Rendering: Edge and Node.js Runtimes | Next.js](https://nextjs.org/docs/14/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- [File-system conventions: proxy.js | Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [mastra - npm](https://www.npmjs.com/package/mastra)

### Memory Backend
- [Storage | Memory | Mastra Docs v1 Beta](https://mastra.ai/docs/v1/memory/storage)
- [Example: Memory with PostgreSQL | Memory | Mastra Docs](https://mastra.ai/en/examples/memory/memory-with-pg)
- [@mastra/pg - npm](https://www.npmjs.com/package/@mastra/pg)
- [Reference: PostgreSQL Storage | Storage | Mastra Docs](https://mastra.ai/reference/storage/postgresql)
- [Mastra Storage: a flexible storage system for AI Applications](https://mastra.ai/blog/mastra-storage)

### Workflow Orchestration
- [Control Flow | Workflows | Mastra Docs](https://mastra.ai/docs/workflows/control-flow)
- [Example: Parallel Execution with Steps | Workflows (Legacy) | Mastra Docs](https://mastra.ai/examples/workflows_legacy/parallel-steps)
- [Building workflows with Mastra | Mastra Blog](https://mastra.ai/blog/building-workflows)
- [A deep dive into Mastra AI workflows with code examples](https://khaledgarbaya.net/blog/mastering-mastra-ai-workflows/)
- [Workflow streaming | Streaming | Mastra Docs](https://mastra.ai/docs/streaming/workflow-streaming)

### Observability
- [Tracing | Mastra Observability Documentation](https://mastra.ai/en/docs/observability/tracing)
- [Logging | Mastra Observability Documentation](https://mastra.ai/en/docs/observability/logging)
- [Observability Overview | Observability | Mastra Docs](https://mastra.ai/docs/observability/overview)
- [Next.js Tracing | Mastra Observability Documentation](https://mastra.ai/en/docs/observability/nextjs-tracing)
- [Middleware | Server & DB | Mastra Docs](https://mastra.ai/docs/server-db/middleware)

### SSE Streaming
- [Using Vercel AI SDK | Frameworks | Mastra Docs](https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk)
- [@mastra/ai-sdk - npm](https://www.npmjs.com/package/@mastra/ai-sdk)
- [The next evolution of Mastra streaming - Mastra Blog](https://mastra.ai/blog/mastra-streaming)
- [Reference: Agent.stream() | Streaming | Mastra Docs](https://mastra.ai/reference/streaming/agents/stream)
- [AI SDK UI: Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)

### Conflict Resolution
- [PostgreSQL: Documentation: 18: INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL Upsert: INSERT ON CONFLICT Guide](https://www.dbvis.com/thetable/postgresql-upsert-insert-on-conflict-guide/)
- [Using "INSERT ON CONFLICT" to Upsert and Modify Data in PostgreSQL](https://www.prisma.io/dataguide/postgresql/inserting-and-modifying-data/insert-on-conflict)
- [Memory overview | Memory | Mastra Docs](https://mastra.ai/docs/memory/overview)

---

**End of Research Document**
