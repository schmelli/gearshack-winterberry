# Data Model: Mastra Agentic Voice AI

**Feature**: 001-mastra-agentic-voice
**Created**: 2025-12-20
**Status**: Design Phase

---

## Overview

This document defines the complete data model for the Mastra Agentic Voice AI integration, including database schemas, TypeScript interfaces, Zod validators, and state transition diagrams.

---

## Database Schemas

### 1. conversation_memory

Stores persistent conversation history for memory-enabled AI interactions.

```sql
CREATE TABLE conversation_memory (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation grouping
  conversation_id UUID NOT NULL,

  -- Message identity (globally unique across all conversations)
  message_id UUID NOT NULL,

  -- Message content
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,

  -- Flexible metadata storage (tool calls, citations, preferences)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps for conflict resolution and retention
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite unique constraint for conflict detection
  UNIQUE(user_id, conversation_id, message_id)
);

-- Performance indexes
CREATE INDEX idx_conversation_memory_user_conversation
  ON conversation_memory(user_id, conversation_id, created_at DESC);

CREATE INDEX idx_conversation_memory_metadata
  ON conversation_memory USING gin(metadata jsonb_path_ops);

CREATE INDEX idx_conversation_memory_updated
  ON conversation_memory(updated_at);

-- Full-text search index (for future semantic search)
CREATE INDEX idx_conversation_memory_content_search
  ON conversation_memory USING gin(to_tsvector('english', message_content));

-- Row Level Security
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own memory"
  ON conversation_memory
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON conversation_memory
  FOR ALL
  TO service_role
  USING (true);
```

**Retention**: 90 days with automatic archival/summarization.

**Conflict Resolution**: Last-write-wins using server-side `updated_at` timestamps.

---

### 2. workflow_executions

Tracks multi-step workflow execution for trip planning and complex reasoning.

```sql
CREATE TABLE workflow_executions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workflow metadata
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),

  -- Execution state
  current_step TEXT,
  step_results JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

-- Performance indexes
CREATE INDEX idx_workflow_executions_user_status
  ON workflow_executions(user_id, status, started_at DESC);

CREATE INDEX idx_workflow_executions_name
  ON workflow_executions(workflow_name, started_at DESC);

-- Row Level Security
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own workflows"
  ON workflow_executions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON workflow_executions
  FOR ALL
  TO service_role
  USING (true);
```

**Purpose**: Observability, debugging, and distributed tracing for complex workflows.

---

### 3. rate_limit_tracking

Implements tiered rate limiting to prevent AI cost overruns.

```sql
CREATE TABLE rate_limit_tracking (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rate limit dimensions
  operation_type TEXT NOT NULL CHECK (operation_type IN ('simple_query', 'workflow', 'voice')),
  request_count INTEGER NOT NULL DEFAULT 0,

  -- Time window
  window_start TIMESTAMPTZ NOT NULL,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, operation_type, window_start)
);

-- Performance indexes
CREATE INDEX idx_rate_limit_user_window
  ON rate_limit_tracking(user_id, window_start DESC);

-- Row Level Security
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own rate limits"
  ON rate_limit_tracking
  FOR ALL
  USING (auth.uid() = user_id);
```

**Rate Limits**:
- `simple_query`: Unlimited (memory recalls, gear lookups)
- `workflow`: 20 requests/hour (trip planning, complex reasoning)
- `voice`: 40 requests/hour (transcription + TTS)

---

### 4. gdpr_deletion_records

Audit trail for GDPR Right to Erasure (Article 17) compliance.

```sql
CREATE TABLE gdpr_deletion_records (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (preserved for audit even after deletion)
  user_id UUID NOT NULL,

  -- Deletion workflow state
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Timing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Results
  records_deleted INTEGER DEFAULT 0,
  error_message TEXT
);

-- Performance indexes
CREATE INDEX idx_gdpr_deletion_user
  ON gdpr_deletion_records(user_id, requested_at DESC);

CREATE INDEX idx_gdpr_deletion_status
  ON gdpr_deletion_records(status, requested_at DESC);

-- Row Level Security
ALTER TABLE gdpr_deletion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own deletion records"
  ON gdpr_deletion_records
  FOR ALL
  USING (user_id::text = auth.uid()::text);
```

**SLA**: Deletion completes within 24 hours of request.

---

## TypeScript Interfaces

### Core Entities

```typescript
/**
 * Conversation memory record
 * Stored in conversation_memory table
 */
export interface ConversationMemory {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  messageRole: 'user' | 'assistant' | 'system';
  messageContent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow execution record
 * Tracks multi-step workflow progress
 */
export interface WorkflowExecution {
  id: string;
  userId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  currentStep: string | null;
  stepResults: Record<string, unknown>;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
}

/**
 * Rate limit tracking record
 * Enforces tiered rate limits by operation type
 */
export interface RateLimitTracking {
  id: string;
  userId: string;
  operationType: 'simple_query' | 'workflow' | 'voice';
  requestCount: number;
  windowStart: Date;
  lastRequestAt: Date;
}

/**
 * GDPR deletion audit record
 * Tracks Right to Erasure requests
 */
export interface GdprDeletionRecord {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt: Date | null;
  recordsDeleted: number;
  errorMessage: string | null;
}
```

---

### Mastra Configuration Entities

```typescript
/**
 * Mastra agent configuration
 * Embedded in Next.js application
 */
export interface MastraAgent {
  name: string;
  model: string; // e.g., "gpt-4o-mini", "claude-3-5-sonnet"
  instructions: string; // System prompt with persona
  tools: MCPTool[];
  memory: {
    adapter: 'supabase';
    retentionDays: number; // 90 days
  };
  workflows: WorkflowDefinition[];
  observability: {
    logging: {
      enabled: boolean;
      format: 'json';
      level: 'info' | 'debug' | 'warn' | 'error';
    };
    metrics: {
      enabled: boolean;
      endpoint: string; // e.g., "/api/mastra/metrics"
    };
    tracing: {
      enabled: boolean;
    };
  };
}

/**
 * MCP tool definition
 * Dynamically discovered from GearGraph MCP server
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  transport: 'stdio' | 'http';
  endpoint?: string; // For HTTP transport
}

/**
 * Workflow definition
 * Multi-step reasoning process
 */
export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  maxDurationMs: number; // Timeout threshold
}

/**
 * Individual workflow step
 * Can be sequential or parallel
 */
export interface WorkflowStep {
  id: string;
  type: 'tool_call' | 'llm_reasoning' | 'api_request' | 'parallel_group';
  dependencies: string[]; // Step IDs that must complete first
  config: Record<string, unknown>;
}

/**
 * Voice interaction session
 * Complete request-response cycle
 */
export interface VoiceInteractionSession {
  id: string;
  userId: string;
  audioUrl: string; // Uploaded audio file
  transcription: {
    text: string;
    confidence: number;
    provider: 'whisper' | 'vercel-ai-sdk';
  };
  aiResponse: {
    text: string;
    audioUrl: string; // TTS output
    latencyMs: number;
  };
  createdAt: Date;
}

/**
 * Memory correction event
 * User-initiated fact update
 */
export interface MemoryCorrectionEvent {
  id: string;
  userId: string;
  conversationId: string;
  correctionType: 'fact_update' | 'preference_change' | 'deletion';
  originalContent: string;
  correctedContent: string;
  createdAt: Date;
}
```

---

## Zod Validators

### Runtime Validation Schemas

```typescript
import { z } from 'zod';

/**
 * Message role validator
 */
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

/**
 * Conversation memory validator
 */
export const ConversationMemorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  messageRole: MessageRoleSchema,
  messageContent: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Workflow execution status validator
 */
export const WorkflowStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'timeout',
]);

/**
 * Workflow execution validator
 */
export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  workflowName: z.string().min(1),
  status: WorkflowStatusSchema,
  currentStep: z.string().nullable(),
  stepResults: z.record(z.unknown()).default({}),
  errorMessage: z.string().nullable(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
});

/**
 * Rate limit operation type validator
 */
export const RateLimitOperationSchema = z.enum([
  'simple_query',
  'workflow',
  'voice',
]);

/**
 * Rate limit tracking validator
 */
export const RateLimitTrackingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  operationType: RateLimitOperationSchema,
  requestCount: z.number().int().nonnegative(),
  windowStart: z.date(),
  lastRequestAt: z.date(),
});

/**
 * GDPR deletion status validator
 */
export const GdprDeletionStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

/**
 * GDPR deletion record validator
 */
export const GdprDeletionRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: GdprDeletionStatusSchema,
  requestedAt: z.date(),
  completedAt: z.date().nullable(),
  recordsDeleted: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
});

/**
 * Voice transcription validator
 */
export const VoiceTranscriptionSchema = z.object({
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  provider: z.enum(['whisper', 'vercel-ai-sdk']),
});

/**
 * Memory correction validator
 */
export const MemoryCorrectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  correctionType: z.enum(['fact_update', 'preference_change', 'deletion']),
  originalContent: z.string(),
  correctedContent: z.string(),
  createdAt: z.date(),
});
```

---

## State Transition Diagrams

### 1. Workflow Execution State Machine

```
┌─────────┐
│ pending │
└────┬────┘
     │
     │ Agent starts workflow
     ▼
┌─────────┐
│ running │◄───────────┐
└────┬────┘            │
     │                 │ Step completes
     │                 │ (continues)
     ├─────────────────┘
     │
     │ All steps complete
     ▼
┌───────────┐
│ completed │
└───────────┘

     │ Step fails
     ▼
┌──────────┐
│  failed  │
└──────────┘

     │ Exceeds maxDurationMs
     ▼
┌──────────┐
│ timeout  │
└──────────┘
```

**Valid Transitions**:
- `pending` → `running`: Workflow starts
- `running` → `completed`: All steps succeed
- `running` → `failed`: Any step fails
- `running` → `timeout`: Exceeds time limit
- `running` → `running`: Step completes, continues

**Terminal States**: `completed`, `failed`, `timeout`

---

### 2. GDPR Deletion State Machine

```
┌─────────┐
│ pending │
└────┬────┘
     │
     │ Deletion job starts
     ▼
┌────────────┐
│ processing │
└─────┬──────┘
      │
      │ All records deleted
      ▼
┌───────────┐
│ completed │
└───────────┘

      │ Error during deletion
      ▼
┌──────────┐
│  failed  │
└──────────┘
```

**Valid Transitions**:
- `pending` → `processing`: Background job starts
- `processing` → `completed`: Deletion succeeds
- `processing` → `failed`: Deletion error

**Terminal States**: `completed`, `failed`

**SLA**: Must reach terminal state within 24 hours.

---

### 3. Rate Limit Window Reset Logic

```
┌─────────────────────────────────────┐
│ Window Active                       │
│ (window_start ≤ now < window_end)   │
└─────────┬───────────────────────────┘
          │
          │ request_count < limit
          │
          ▼
    ┌──────────┐
    │  Allow   │
    └────┬─────┘
         │
         │ Increment request_count
         │ Update last_request_at
         │
         └───────────────────────┐
                                 │
          ┌──────────────────────┘
          │
          │ request_count ≥ limit
          │
          ▼
    ┌──────────┐
    │  Reject  │
    └────┬─────┘
         │
         │ Return 429 Too Many Requests
         │ Include Retry-After header
         │
         └───────────────────────┐
                                 │
          ┌──────────────────────┘
          │
          │ now ≥ window_end
          │
          ▼
    ┌──────────────┐
    │ Reset Window │
    └────┬─────────┘
         │
         │ window_start = now
         │ request_count = 0
         │
         └─────────► Allow
```

**Window Duration**: 1 hour (3600 seconds)

**Limits by Operation Type**:
- `simple_query`: Unlimited (bypass rate limiting)
- `workflow`: 20 requests/hour
- `voice`: 40 requests/hour

---

## Conflict Resolution Strategy

### Last-Write-Wins (LWW)

When the same message is updated concurrently from multiple devices:

**Example Scenario**:
1. **Device A** (phone) updates `message_id=abc123` at `T1` (server receives at `T1+100ms`)
2. **Device B** (tablet) updates `message_id=abc123` at `T2` (server receives at `T2+50ms`, arrives first)

**Resolution**:
```sql
INSERT INTO conversation_memory (
  user_id, conversation_id, message_id, message_role, message_content, metadata, created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, now() -- Server timestamp
)
ON CONFLICT (user_id, conversation_id, message_id) DO UPDATE SET
  message_content = EXCLUDED.message_content,
  metadata = EXCLUDED.metadata,
  updated_at = now(); -- Always use server timestamp
```

**Outcome**: Final state = **Device A's update** (later `updated_at`)

**Why Server Timestamps**:
- Client clocks may be out of sync (NTP drift, timezone issues)
- Server-side `now()` provides authoritative ordering
- PostgreSQL transaction isolation ensures atomic updates

---

## Data Retention & GDPR Compliance

### Automatic 90-Day Retention

**Scheduled Job** (runs daily via Supabase Edge Function or cron):

```typescript
export async function cleanupExpiredMemory(supabase: SupabaseClient) {
  const retentionDays = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { error } = await supabase
    .from('conversation_memory')
    .delete()
    .lt('created_at', cutoffDate.toISOString());

  if (error) {
    throw new Error(`Retention cleanup failed: ${error.message}`);
  }
}
```

### GDPR Right to Erasure

**User-Initiated Deletion** (from Settings page):

```typescript
// POST /api/mastra/memory/delete
export async function deleteUserMemory(userId: string) {
  const deletionRecord = await supabase
    .from('gdpr_deletion_records')
    .insert({
      user_id: userId,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Background job processes deletion asynchronously
  // Completes within 24 hours

  return deletionRecord;
}
```

**Deletion Scope**:
- All `conversation_memory` records for `user_id`
- All `workflow_executions` for `user_id`
- All `rate_limit_tracking` for `user_id`
- Anonymize `userId` in structured logs (preserve metrics)

---

## Summary

This data model provides:

✅ **4 database tables** with RLS policies for multi-tenancy
✅ **11 TypeScript interfaces** for type-safe development
✅ **7 Zod validators** for runtime validation
✅ **3 state machines** with clear transition rules
✅ **Conflict resolution** via last-write-wins with server timestamps
✅ **GDPR compliance** with 90-day retention and Right to Erasure

**Next Steps**: Implement API contracts (see `contracts/` directory) and integration guide (see `quickstart.md`).
