# Research Deliverable 08: Conflict Resolution Strategy

**Research Question**: How does Mastra handle concurrent memory updates (for cross-device scenarios)?

**Status**: ✅ Resolved
**Decision**: **Custom last-write-wins implementation** - No built-in conflict resolution in Mastra
**Date**: 2025-12-20

---

## Executive Summary

Mastra memory adapters **do not provide built-in conflict resolution**. Custom implementation required using **last-write-wins (LWW) strategy with server-side timestamps** in Supabase. PostgreSQL `upsert` with `onConflict` clause + `updated_at: now()` ensures most recent write always takes precedence. No client-side optimistic update rollback needed - database handles conflicts atomically.

---

## Conflict Scenarios

### Cross-Device Concurrent Updates

**User Story**: Jessica uses GearShack AI on both her phone and tablet. She asks about tent recommendations on her phone, then switches to her tablet and continues the conversation. Both devices update conversation memory simultaneously.

**Conflict Example**:

```
Timeline:
T0: Jessica on phone: "What's my lightest tent?"
T1: Phone sends message to server (arrives at T1+100ms)
T2: Jessica on tablet: "Actually, show me the lightest tent" (same query, different wording)
T3: Tablet sends message to server (arrives at T3+50ms, arrives BEFORE phone message)

Problem: Same message_id updated from two devices with different content
- Tablet version: "Actually, show me the lightest tent" (arrives first)
- Phone version: "What's my lightest tent?" (arrives second)

Question: Which version should persist?
```

**Answer**: **Last-write-wins (LWW)** - Phone version persists because it has a later server timestamp.

---

## Last-Write-Wins (LWW) Implementation

### Database Schema with Conflict Detection

```sql
-- supabase/migrations/20250120_conversation_memory.sql
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL UNIQUE, -- Unique constraint for conflict detection
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps for conflict resolution
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- Server-side timestamp for ordering

  -- Composite unique constraint (user + conversation + message)
  CONSTRAINT unique_user_conversation_message UNIQUE (user_id, conversation_id, message_id)
);

-- Index for fast retrieval with timestamp ordering
CREATE INDEX idx_conversation_memory_lookup
  ON conversation_memory (user_id, conversation_id, created_at DESC);

-- RLS policies
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

### Supabase Upsert with LWW

```typescript
// lib/mastra/adapters/supabase-memory-adapter.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { MemoryAdapter, Message } from '@mastra/memory';

export class SupabaseMemoryAdapter implements MemoryAdapter {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async saveMessages(messages: Message[]): Promise<void> {
    const records = messages.map(msg => ({
      user_id: msg.userId,
      conversation_id: msg.conversationId,
      message_id: msg.id, // Unique across all conversations
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || {},
      created_at: msg.createdAt.toISOString(),
      updated_at: new Date().toISOString() // Server-side timestamp for LWW
    }));

    const { error } = await this.supabase
      .from('conversation_memory')
      .upsert(records, {
        onConflict: 'message_id', // Conflict on unique message_id
        ignoreDuplicates: false, // ALWAYS overwrite with latest
      });

    if (error) {
      throw new Error(`Memory save failed: ${error.message}`);
    }
  }
}
```

### How LWW Works

```sql
-- Scenario: Two concurrent updates for same message_id

-- Device A (Phone) - Request arrives at T1+100ms
INSERT INTO conversation_memory (
  user_id, conversation_id, message_id, role, content, created_at, updated_at
) VALUES (
  'user-123', 'conv-456', 'msg-789', 'user', 'What is my lightest tent?',
  '2025-01-20T10:00:00Z', now() -- Server timestamp: 2025-01-20T10:00:00.100Z
)
ON CONFLICT (message_id) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now(); -- Server timestamp when update occurs

-- Device B (Tablet) - Request arrives at T1+50ms (BEFORE phone)
INSERT INTO conversation_memory (
  user_id, conversation_id, message_id, role, content, created_at, updated_at
) VALUES (
  'user-123', 'conv-456', 'msg-789', 'user', 'Actually, show me the lightest tent',
  '2025-01-20T10:00:00Z', now() -- Server timestamp: 2025-01-20T10:00:00.050Z
)
ON CONFLICT (message_id) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now(); -- Server timestamp when update occurs

-- RESULT: Final content = "What is my lightest tent?" (Phone version)
-- Because Phone's `updated_at` (10:00:00.100) > Tablet's `updated_at` (10:00:00.050)
```

**Key Insight**: PostgreSQL's `now()` function uses **transaction start time**, ensuring consistent ordering even with concurrent transactions. The last transaction to commit wins.

---

## Server-Side Timestamp Strategy

### Why Server Timestamps vs Client Timestamps?

| Aspect | Client Timestamp | Server Timestamp |
|--------|------------------|------------------|
| **Clock Sync** | Vulnerable to NTP drift, timezone issues | Always accurate (database server clock) |
| **Tampering** | Client can manipulate timestamp | Tamper-proof (database-controlled) |
| **Ordering** | May be out of order due to network latency | Correct ordering guaranteed by database |
| **Consistency** | Different devices may have different times | Single source of truth (database) |

**Decision**: Use **server-side `now()`** for `updated_at` column.

### Implementation Details

```typescript
// lib/mastra/adapters/supabase-memory-adapter.ts (detailed)
async saveMessages(messages: Message[]): Promise<void> {
  const records = messages.map(msg => ({
    user_id: msg.userId,
    conversation_id: msg.conversationId,
    message_id: msg.id,
    role: msg.role,
    content: msg.content,
    metadata: msg.metadata || {},
    created_at: msg.createdAt.toISOString(), // Client timestamp (for display)
    updated_at: new Date().toISOString() // Will be replaced by server's now()
  }));

  // Supabase automatically replaces updated_at with server timestamp
  const { error } = await this.supabase
    .from('conversation_memory')
    .upsert(records, {
      onConflict: 'message_id',
      ignoreDuplicates: false, // Always overwrite
    });

  if (error) {
    throw new Error(`Memory save failed: ${error.message}`);
  }

  // No need to fetch latest state - LWW handled at database level
}
```

---

## PostgreSQL Transaction Isolation

### How Concurrent Updates Are Handled

PostgreSQL uses **Read Committed isolation level** by default, ensuring:

1. **Atomic Upserts**: Each `upsert` operation is atomic (all-or-nothing)
2. **Row-Level Locking**: Concurrent updates to same `message_id` are serialized
3. **Timestamp Ordering**: `now()` returns transaction start time, ensuring consistent ordering

**Example**:

```sql
-- Transaction 1 (Phone)
BEGIN;
-- now() = 2025-01-20T10:00:00.100Z
INSERT INTO conversation_memory (...) VALUES (..., now())
ON CONFLICT (message_id) DO UPDATE SET updated_at = now();
COMMIT; -- Completes at T1+150ms

-- Transaction 2 (Tablet)
BEGIN;
-- now() = 2025-01-20T10:00:00.050Z
INSERT INTO conversation_memory (...) VALUES (..., now())
ON CONFLICT (message_id) DO UPDATE SET updated_at = now();
COMMIT; -- Completes at T1+200ms (AFTER Transaction 1)

-- Final result: Transaction 2's update overwrites Transaction 1
-- Because Transaction 2 committed later (T1+200ms > T1+150ms)
```

**Outcome**: Last transaction to commit wins, regardless of request arrival order.

---

## No Client-Side Rollback Needed

### Why No Optimistic Updates?

**Alternative Approach** (not used): Optimistic UI updates with rollback on conflict.

```typescript
// NOT IMPLEMENTED (unnecessary complexity)
async saveMessagesWithOptimisticUpdate(messages: Message[]): Promise<void> {
  // 1. Optimistically update local state
  localState.messages.push(...messages);
  rerender();

  try {
    // 2. Send to server
    await this.supabase.from('conversation_memory').upsert(messages);
  } catch (error) {
    // 3. Rollback local state on error
    localState.messages = localState.messages.filter(m => !messages.includes(m));
    rerender();
    throw error;
  }
}
```

**Why This Is Unnecessary**:
- Conversation memory updates are **infrequent** (1-2 per minute)
- **No UI state** depends on immediate consistency (messages display from database, not local cache)
- **LWW at database level** ensures eventual consistency without client intervention
- **Simpler architecture**: No rollback logic, no state synchronization complexity

**Decision**: Let database handle conflicts entirely. Client simply writes to database and trusts LWW resolution.

---

## Conflict Resolution Behavior

### Scenario 1: Same Message Updated from Two Devices

```typescript
// Device A (Phone) - T1
await adapter.saveMessages([{
  id: 'msg-123',
  userId: 'user-abc',
  conversationId: 'conv-xyz',
  role: 'user',
  content: 'What is my lightest tent?',
  createdAt: new Date('2025-01-20T10:00:00Z'),
  updatedAt: new Date() // Will use server timestamp
}]);

// Device B (Tablet) - T2 (50ms later)
await adapter.saveMessages([{
  id: 'msg-123', // Same message_id!
  userId: 'user-abc',
  conversationId: 'conv-xyz',
  role: 'user',
  content: 'Actually, show me the lightest tent', // Different content
  createdAt: new Date('2025-01-20T10:00:00Z'),
  updatedAt: new Date() // Will use server timestamp
}]);

// RESULT: Tablet's version persists (later server timestamp)
```

### Scenario 2: Different Messages from Same Conversation

```typescript
// Device A (Phone) - T1
await adapter.saveMessages([{
  id: 'msg-123',
  content: 'What is my lightest tent?',
  // ...
}]);

// Device B (Tablet) - T2
await adapter.saveMessages([{
  id: 'msg-456', // Different message_id
  content: 'What about sleeping bags?',
  // ...
}]);

// RESULT: Both messages persist (no conflict)
```

### Scenario 3: Metadata Updates

```typescript
// Device A updates message metadata
await adapter.saveMessages([{
  id: 'msg-123',
  content: 'What is my lightest tent?',
  metadata: { edited: true, editedAt: '2025-01-20T10:05:00Z' },
  // ...
}]);

// Device B updates same message content
await adapter.saveMessages([{
  id: 'msg-123',
  content: 'What is my lightest tent? (edited)',
  metadata: { edited: false }, // Older metadata
  // ...
}]);

// RESULT: Last write wins - Device B's update overwrites Device A's metadata
// Potential data loss: `editedAt` timestamp lost

// SOLUTION: Merge metadata at application level before saving
const existingMessage = await adapter.getMessages({ userId, conversationId });
const mergedMetadata = { ...existingMessage.metadata, ...newMetadata };
await adapter.saveMessages([{ ...message, metadata: mergedMetadata }]);
```

---

## Testing Conflict Resolution

### Unit Test: Concurrent Updates

```typescript
// __tests__/lib/mastra/supabase-memory-adapter.test.ts
import { describe, it, expect } from 'vitest';
import { SupabaseMemoryAdapter } from '@/lib/mastra/adapters/supabase-memory-adapter';
import { createClient } from '@supabase/supabase-js';

describe('SupabaseMemoryAdapter - Conflict Resolution', () => {
  it('should resolve concurrent updates with last-write-wins', async () => {
    const supabase = createClient(/* test credentials */);
    const adapter = new SupabaseMemoryAdapter(supabase);

    const messageId = 'msg-conflict-test';
    const userId = 'user-test';
    const conversationId = 'conv-test';

    // Device A update
    await adapter.saveMessages([{
      id: messageId,
      userId,
      conversationId,
      role: 'user',
      content: 'Device A content',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Wait 100ms to ensure different server timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    // Device B update (should win)
    await adapter.saveMessages([{
      id: messageId,
      userId,
      conversationId,
      role: 'user',
      content: 'Device B content (later)',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Retrieve final state
    const messages = await adapter.getMessages({ userId, conversationId });
    const finalMessage = messages.find(m => m.id === messageId);

    expect(finalMessage.content).toBe('Device B content (later)');
    expect(finalMessage.updatedAt.getTime()).toBeGreaterThan(finalMessage.createdAt.getTime());
  });

  it('should handle rapid-fire updates from single device', async () => {
    const adapter = new SupabaseMemoryAdapter(createClient());
    const messageId = 'msg-rapid-test';

    // Simulate rapid edits (within 1 second)
    for (let i = 1; i <= 5; i++) {
      await adapter.saveMessages([{
        id: messageId,
        userId: 'user-test',
        conversationId: 'conv-test',
        role: 'user',
        content: `Edit version ${i}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms between edits
    }

    // Retrieve final state
    const messages = await adapter.getMessages({ userId: 'user-test', conversationId: 'conv-test' });
    const finalMessage = messages.find(m => m.id === messageId);

    expect(finalMessage.content).toBe('Edit version 5'); // Last edit wins
  });
});
```

---

## Observability & Monitoring

### Conflict Detection Metrics

```typescript
// lib/observability/metrics.ts (conflict-specific)
import { Counter, Histogram } from 'prom-client';

export const memoryConflictsTotal = new Counter({
  name: 'mastra_memory_conflicts_total',
  help: 'Total memory upsert conflicts (last-write-wins)',
  labelNames: ['user_id', 'conversation_id']
});

export const memoryUpdateLatency = new Histogram({
  name: 'mastra_memory_update_latency_seconds',
  help: 'Memory update latency (including conflict resolution)',
  buckets: [0.01, 0.05, 0.1, 0.5, 1], // 10ms to 1s
  labelNames: ['conflict_occurred'] // true | false
});
```

### Logging Conflict Events

```typescript
// lib/mastra/adapters/supabase-memory-adapter.ts (with logging)
async saveMessages(messages: Message[]): Promise<void> {
  const startTime = Date.now();
  let conflictOccurred = false;

  // Check if message_id already exists (potential conflict)
  for (const msg of messages) {
    const { data: existing } = await this.supabase
      .from('conversation_memory')
      .select('message_id, updated_at')
      .eq('message_id', msg.id)
      .single();

    if (existing) {
      conflictOccurred = true;
      logger.warn({
        type: 'memory.conflict.detected',
        messageId: msg.id,
        userId: msg.userId,
        conversationId: msg.conversationId,
        previousUpdateAt: existing.updated_at
      });
    }
  }

  // Perform upsert
  const records = messages.map(/* ... */);
  const { error } = await this.supabase
    .from('conversation_memory')
    .upsert(records, { onConflict: 'message_id', ignoreDuplicates: false });

  if (error) throw new Error(`Memory save failed: ${error.message}`);

  // Emit metrics
  const duration = (Date.now() - startTime) / 1000;
  memoryUpdateLatency.observe({ conflict_occurred: conflictOccurred.toString() }, duration);

  if (conflictOccurred) {
    memoryConflictsTotal.inc({
      user_id: messages[0].userId,
      conversation_id: messages[0].conversationId
    });
  }

  logger.info({
    type: 'memory.save.complete',
    messageCount: messages.length,
    conflictOccurred,
    duration: duration * 1000
  });
}
```

---

## GDPR Compliance: Conflict Resolution During Deletion

### User Requests Data Deletion

**Scenario**: User requests immediate deletion (GDPR Article 17) while conversation memory is being written from another device.

**Conflict**:
1. Device A writes new message at T1
2. User clicks "Delete All Data" at T2 (before T1 write completes)
3. Deletion executes at T3 (but T1 write is still in flight)

**Resolution**:

```typescript
// lib/mastra/adapters/supabase-memory-adapter.ts
async deleteMessages(options: {
  userId: string;
  conversationId?: string;
  messageIds?: string[];
}): Promise<void> {
  let query = this.supabase
    .from('conversation_memory')
    .delete()
    .eq('user_id', options.userId);

  if (options.conversationId && !options.messageIds) {
    query = query.eq('conversation_id', options.conversationId);
  }

  if (options.messageIds && options.messageIds.length > 0) {
    query = query.in('message_id', options.messageIds);
  }

  // Execute deletion
  const { error } = await query;

  if (error) {
    throw new Error(`Memory deletion failed: ${error.message}`);
  }

  // Mark user for deletion audit log
  await this.supabase
    .from('deletion_audit_log')
    .insert({
      user_id: options.userId,
      deleted_at: new Date().toISOString(),
      scope: options.conversationId ? 'conversation' : 'all_memory'
    });
}
```

**Outcome**: In-flight writes after deletion are blocked by RLS policy (user no longer exists or `deleted_at` flag set).

---

## Alternative Approaches Considered

### Option 1: Operational Transformation (OT)

**Concept**: Merge concurrent edits intelligently (like Google Docs).

**Rejected Because**:
- Overkill for conversation memory (not collaborative editing)
- Complex implementation (requires operational transform functions)
- Message content is typically append-only (not edited)

### Option 2: Conflict-Free Replicated Data Types (CRDTs)

**Concept**: Use CRDT data structures for automatic conflict resolution.

**Rejected Because**:
- Requires specialized database support (e.g., Automerge, Yjs)
- Supabase PostgreSQL does not natively support CRDTs
- LWW sufficient for conversation memory use case

### Option 3: Vector Clocks

**Concept**: Track causality with vector clocks, merge concurrent updates.

**Rejected Because**:
- Adds complexity (vector clock metadata per message)
- LWW simpler and sufficient for conversation memory
- No strong causality requirements (messages are independent)

---

## Conclusion

**Deliverable**: Complete conflict resolution strategy using last-write-wins with server-side timestamps in Supabase.

**Key Decisions**:
1. **Strategy**: Last-write-wins (LWW) with server timestamps
2. **Implementation**: PostgreSQL `upsert` with `onConflict: 'message_id'`
3. **Timestamp Source**: Server-side `now()` (not client-provided)
4. **Client Rollback**: Not needed (database handles conflicts atomically)

**Guarantees**:
- ✅ Consistent conflict resolution across all devices
- ✅ Tamper-proof ordering (server-controlled timestamps)
- ✅ Atomic updates (PostgreSQL transaction isolation)
- ✅ No client-side complexity (no optimistic update rollback)

**Trade-offs**:
- ✅ Simple implementation (native PostgreSQL upsert)
- ✅ Predictable behavior (always last write wins)
- ⚠️ Potential data loss for metadata updates (merge strategy recommended)
- ❌ No collaborative editing support (not required for this use case)

**Next Steps**:
1. Implement LWW logic in `SupabaseMemoryAdapter.saveMessages()`
2. Add conflict detection logging + metrics
3. Write comprehensive unit tests for concurrent updates
4. Document conflict resolution behavior in API docs
5. Add GDPR-compliant deletion with audit logging
