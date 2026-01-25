# Feature Specification: Mastra Three-Tier Memory System

**Feature Number**: 002-mastra-memory-system
**Feature Branch**: `002-mastra-memory-system`
**Created**: 2026-01-25
**Status**: Approved
**Dependencies**: Feature 001-mastra-agentic-voice (partial)

## Overview

Implement Mastra's complete three-tier memory system to enable the AI agent to truly "know" users over time:

1. **Working Memory**: Structured user profile the agent can read AND update
2. **Conversation History**: Recent messages from current conversation (already implemented)
3. **Semantic Recall**: Vector-based retrieval of relevant past conversations

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | **Supabase only** | Consolidate from dual LibSQL+Supabase to single source |
| Embeddings | **Vercel AI Gateway** | `text-embedding-3-small` via existing gateway |
| Vector Store | **pgvector** | Native PostgreSQL extension in Supabase |
| Working Memory | **Zod Schema** | Type-safe, validates automatically |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONSOLIDATED MEMORY SYSTEM                        │
│                          (Supabase PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  WORKING MEMORY  │  │   CONVERSATION   │  │   SEMANTIC RECALL    │  │
│  │  (user_profiles) │  │     HISTORY      │  │  (vector search)     │  │
│  ├──────────────────┤  │ (conversation_   │  ├──────────────────────┤  │
│  │ • User name      │  │     memory)      │  │ • pgvector extension │  │
│  │ • Preferences    │  ├──────────────────┤  │ • 1536-dim embeddings│  │
│  │ • Goals/trips    │  │ • Last 20 msgs   │  │ • Cosine similarity  │  │
│  │ • Learned facts  │  │ • Thread-scoped  │  │ • Resource-scoped    │  │
│  │ • Cached insights│  │ • Full-text idx  │  │ • topK: 5, range: 2  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                       │               │
│           └─────────────────────┼───────────────────────┘               │
│                                 ▼                                        │
│                    ┌────────────────────────┐                           │
│                    │   Vercel AI Gateway    │                           │
│                    │  text-embedding-3-small│                           │
│                    └────────────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Supabase Consolidation (Remove LibSQL)

### Current State

```typescript
// lib/mastra/instance.ts - CURRENT (to be removed)
import { LibSQLStore } from '@mastra/libsql';
export const mastraStorage = new LibSQLStore({ ... });

// lib/mastra/mastra-agent.ts - CURRENT (dual storage)
const agentMemory = new Memory({
  storage: mastraStorage,  // LibSQL
  options: { lastMessages: 20 }
});
```

### Target State

```typescript
// lib/mastra/memory/supabase-storage.ts - NEW
import { SupabaseClient } from '@supabase/supabase-js';
import { embed } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

export class SupabaseMastraStorage {
  // Unified storage for all memory types
  // Implements Mastra's storage interface
}
```

### Migration Tasks

| # | Task | Files Affected |
|---|------|----------------|
| 1.1 | Remove `@mastra/libsql` from package.json | `package.json` |
| 1.2 | Delete LibSQL instance configuration | `lib/mastra/instance.ts` |
| 1.3 | Create Supabase-native storage adapter | `lib/mastra/memory/supabase-storage.ts` (new) |
| 1.4 | Update mastra-agent.ts to use Supabase | `lib/mastra/mastra-agent.ts` |
| 1.5 | Remove LIBSQL_URL from env examples | `.env.example`, docs |
| 1.6 | Update tests | `__tests__/mastra/*.test.ts` |

---

## Phase 2: Working Memory with Zod Schema

### Database Schema

```sql
-- supabase/migrations/YYYYMMDD_working_memory.sql

CREATE TABLE user_working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Structured profile (JSONB for flexibility, validated by app)
  profile JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One profile per user
  UNIQUE(user_id)
);

-- RLS Policy
ALTER TABLE user_working_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own working memory"
  ON user_working_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance index
CREATE INDEX idx_working_memory_user ON user_working_memory(user_id);

-- Auto-update timestamp
CREATE TRIGGER update_working_memory_timestamp
  BEFORE UPDATE ON user_working_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Zod Schema Definition

```typescript
// lib/mastra/schemas/working-memory.ts
import { z } from 'zod';

/**
 * GearShack User Profile Schema
 *
 * This schema defines what the AI agent "knows" about the user.
 * The agent can READ this at conversation start and UPDATE it during conversations.
 */
export const GearshackUserProfileSchema = z.object({
  // === IDENTITY ===
  name: z.string().optional()
    .describe("User's preferred name"),
  location: z.string().optional()
    .describe("User's region/country for localized recommendations"),
  preferredLanguage: z.enum(['en', 'de']).optional()
    .describe("User's preferred language"),

  // === GEAR PHILOSOPHY ===
  preferences: z.object({
    weightPhilosophy: z.enum(['ultralight', 'lightweight', 'comfort', 'unknown'])
      .default('unknown')
      .describe("User's approach to gear weight"),
    budgetRange: z.enum(['budget', 'mid-range', 'premium', 'mixed', 'unknown'])
      .default('unknown')
      .describe("Typical spending range"),
    qualityVsWeight: z.enum(['weight-priority', 'balanced', 'durability-priority', 'unknown'])
      .default('unknown')
      .describe("Trade-off preference between weight and durability"),
  }).default({}),

  // === ACTIVITIES & EXPERIENCE ===
  activities: z.object({
    primary: z.array(z.string()).default([])
      .describe("Main outdoor activities (hiking, backpacking, climbing, etc.)"),
    experience: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'unknown'])
      .default('unknown')
      .describe("Overall outdoor experience level"),
    typicalTripLength: z.enum(['day-trips', 'weekends', 'week-long', 'thru-hikes', 'mixed', 'unknown'])
      .default('unknown')
      .describe("Typical trip duration"),
  }).default({}),

  // === BRAND PREFERENCES ===
  brands: z.object({
    favorites: z.array(z.string()).default([])
      .describe("Brands user has expressed preference for"),
    avoid: z.array(z.string()).default([])
      .describe("Brands user wants to avoid"),
    curious: z.array(z.string()).default([])
      .describe("Brands user has asked about but not committed to"),
  }).default({}),

  // === GOALS & PLANS ===
  goals: z.object({
    upcomingTrips: z.array(z.object({
      destination: z.string(),
      date: z.string().optional(),
      activity: z.string(),
      addedAt: z.string(),
    })).default([])
      .describe("Trips user has mentioned planning"),
    gearGoals: z.array(z.string()).default([])
      .describe("Specific gear goals (e.g., 'reduce base weight to 10lbs')"),
    wishlistPriorities: z.array(z.string()).default([])
      .describe("Items user has prioritized from wishlist"),
  }).default({}),

  // === LEARNED FACTS ===
  facts: z.array(z.object({
    fact: z.string().describe("The learned fact"),
    category: z.enum(['preference', 'constraint', 'history', 'other']),
    confidence: z.enum(['high', 'medium', 'low']),
    learnedAt: z.string(),
  })).default([])
    .describe("Specific facts learned from conversations"),

  // === GEARGRAPH CACHE ===
  // Cached insights from GearGraph to avoid redundant queries
  cachedInsights: z.array(z.object({
    productName: z.string(),
    brand: z.string().optional(),
    insight: z.string(),
    insightType: z.enum(['alternative', 'compatibility', 'review-summary', 'durability', 'other']),
    retrievedAt: z.string(),
  })).default([])
    .describe("Cached product insights from GearGraph (TTL: 30 days)"),

  // === METADATA ===
  lastInteraction: z.string().optional()
    .describe("ISO timestamp of last conversation"),
  conversationCount: z.number().default(0)
    .describe("Total conversations with the agent"),
});

export type GearshackUserProfile = z.infer<typeof GearshackUserProfileSchema>;

/**
 * Default empty profile for new users
 */
export const DEFAULT_USER_PROFILE: GearshackUserProfile = {
  preferences: {
    weightPhilosophy: 'unknown',
    budgetRange: 'unknown',
    qualityVsWeight: 'unknown',
  },
  activities: {
    primary: [],
    experience: 'unknown',
    typicalTripLength: 'unknown',
  },
  brands: {
    favorites: [],
    avoid: [],
    curious: [],
  },
  goals: {
    upcomingTrips: [],
    gearGoals: [],
    wishlistPriorities: [],
  },
  facts: [],
  cachedInsights: [],
  conversationCount: 0,
};
```

### Agent Instructions for Working Memory

```markdown
## Working Memory

You have access to the user's profile which persists across all conversations.

### Reading Profile
At the start of each conversation, you receive the user's profile. Use this to:
- Greet them by name if known
- Remember their preferences (ultralight vs comfort, budget, etc.)
- Reference their upcoming trips
- Avoid suggesting brands they've said they don't like

### Updating Profile
When you learn NEW information, update the profile:

| User says... | Update field |
|--------------|--------------|
| "I'm planning a PCT thru-hike in May" | goals.upcomingTrips |
| "I prefer ultralight gear" | preferences.weightPhilosophy = 'ultralight' |
| "I don't like Osprey packs" | brands.avoid += 'Osprey' |
| "My name is Sarah" | name = 'Sarah' |
| "I'm from Germany" | location = 'Germany' |

### Important Rules
1. Only update on EXPLICIT statements, not assumptions
2. Confirm significant updates: "I've noted that you're planning a PCT thru-hike"
3. Don't overwrite existing data without reason
4. Cache GearGraph insights after successful queries (TTL 30 days)
5. Clean up cachedInsights older than 30 days
```

---

## Phase 3: Semantic Recall with pgvector

### Database Schema

```sql
-- supabase/migrations/YYYYMMDD_semantic_recall.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing conversation_memory
ALTER TABLE conversation_memory
ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast similarity search
-- HNSW is faster than IVFFlat for <1M vectors
CREATE INDEX idx_conversation_memory_embedding
ON conversation_memory
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function for semantic search
CREATE OR REPLACE FUNCTION search_similar_messages(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  message_role TEXT,
  message_content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.message_id,
    cm.conversation_id,
    cm.message_role,
    cm.message_content,
    1 - (cm.embedding <=> p_query_embedding) as similarity,
    cm.created_at
  FROM conversation_memory cm
  WHERE cm.user_id = p_user_id
    AND cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> p_query_embedding) > p_threshold
  ORDER BY cm.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Function to get message with surrounding context
CREATE OR REPLACE FUNCTION get_message_with_context(
  p_user_id UUID,
  p_conversation_id UUID,
  p_message_id UUID,
  p_context_range INTEGER DEFAULT 2
)
RETURNS TABLE (
  message_id UUID,
  message_role TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ,
  position TEXT -- 'before', 'match', 'after'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Get the target message timestamp
  SELECT created_at INTO v_created_at
  FROM conversation_memory
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id
    AND message_id = p_message_id;

  IF v_created_at IS NULL THEN
    RETURN;
  END IF;

  -- Return messages before, the match, and after
  RETURN QUERY
  (
    -- Messages before
    SELECT cm.message_id, cm.message_role, cm.message_content, cm.created_at, 'before'::TEXT
    FROM conversation_memory cm
    WHERE cm.user_id = p_user_id
      AND cm.conversation_id = p_conversation_id
      AND cm.created_at < v_created_at
    ORDER BY cm.created_at DESC
    LIMIT p_context_range
  )
  UNION ALL
  (
    -- The matched message
    SELECT cm.message_id, cm.message_role, cm.message_content, cm.created_at, 'match'::TEXT
    FROM conversation_memory cm
    WHERE cm.user_id = p_user_id
      AND cm.conversation_id = p_conversation_id
      AND cm.message_id = p_message_id
  )
  UNION ALL
  (
    -- Messages after
    SELECT cm.message_id, cm.message_role, cm.message_content, cm.created_at, 'after'::TEXT
    FROM conversation_memory cm
    WHERE cm.user_id = p_user_id
      AND cm.conversation_id = p_conversation_id
      AND cm.created_at > v_created_at
    ORDER BY cm.created_at ASC
    LIMIT p_context_range
  )
  ORDER BY created_at ASC;
END;
$$;
```

### Embedding Service

```typescript
// lib/mastra/memory/embedding-service.ts
import { embed, embedMany } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
});

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 * More efficient for backfilling
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
    values: texts,
  });
  return embeddings;
}

/**
 * Embedding dimensions for text-embedding-3-small
 */
export const EMBEDDING_DIMENSIONS = 1536;
```

### Semantic Recall Configuration

```typescript
// lib/mastra/memory/semantic-recall.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embedding-service';

export interface SemanticRecallConfig {
  topK: number;        // Number of similar messages to retrieve
  messageRange: number; // Context messages before/after each match
  threshold: number;   // Minimum similarity score (0-1)
  scope: 'thread' | 'resource'; // Search current thread or all user's threads
}

export const DEFAULT_SEMANTIC_CONFIG: SemanticRecallConfig = {
  topK: 5,
  messageRange: 2,
  threshold: 0.7,
  scope: 'resource', // Search ALL user's conversations
};

/**
 * Search for semantically similar messages
 */
export async function searchSimilarMessages(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  config: SemanticRecallConfig = DEFAULT_SEMANTIC_CONFIG
): Promise<SemanticMatch[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Search using pgvector
  const { data, error } = await supabase.rpc('search_similar_messages', {
    p_user_id: userId,
    p_query_embedding: queryEmbedding,
    p_limit: config.topK,
    p_threshold: config.threshold,
  });

  if (error) throw error;

  // Fetch surrounding context for each match
  const matchesWithContext = await Promise.all(
    data.map(async (match) => {
      const { data: context } = await supabase.rpc('get_message_with_context', {
        p_user_id: userId,
        p_conversation_id: match.conversation_id,
        p_message_id: match.message_id,
        p_context_range: config.messageRange,
      });

      return {
        ...match,
        context: context || [],
      };
    })
  );

  return matchesWithContext;
}
```

---

## Phase 4: Embedding Backfill Strategy

### Backfill Script

```typescript
// scripts/backfill-embeddings.ts
import { createClient } from '@supabase/supabase-js';
import { generateEmbeddings } from '../lib/mastra/memory/embedding-service';

const BATCH_SIZE = 100; // OpenAI allows up to 2048, but we'll be conservative
const DELAY_MS = 1000;  // Rate limiting delay between batches

async function backfillEmbeddings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for bulk operations
  );

  console.log('Starting embedding backfill...');

  // Get count of messages without embeddings
  const { count } = await supabase
    .from('conversation_memory')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  console.log(`Found ${count} messages without embeddings`);

  let processed = 0;
  let offset = 0;

  while (processed < (count || 0)) {
    // Fetch batch
    const { data: messages, error } = await supabase
      .from('conversation_memory')
      .select('id, message_content')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error);
      break;
    }

    if (!messages || messages.length === 0) {
      break;
    }

    // Generate embeddings in batch
    const texts = messages.map(m => m.message_content);
    const embeddings = await generateEmbeddings(texts);

    // Update each message with its embedding
    for (let i = 0; i < messages.length; i++) {
      const { error: updateError } = await supabase
        .from('conversation_memory')
        .update({ embedding: embeddings[i] })
        .eq('id', messages[i].id);

      if (updateError) {
        console.error(`Failed to update message ${messages[i].id}:`, updateError);
      }
    }

    processed += messages.length;
    console.log(`Processed ${processed}/${count} messages`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    offset += BATCH_SIZE;
  }

  console.log('Backfill complete!');
}

backfillEmbeddings().catch(console.error);
```

### Backfill Migration (Optional - Trigger-based)

```sql
-- supabase/migrations/YYYYMMDD_embedding_trigger.sql

-- Note: This is for NEW messages only
-- Backfill script handles existing messages

-- Option: Use Edge Function for embedding generation
-- This trigger calls an edge function to generate embeddings async

CREATE OR REPLACE FUNCTION trigger_generate_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only for messages without embeddings
  IF NEW.embedding IS NULL THEN
    -- Queue for async embedding generation
    -- (Edge function polls this or use pg_notify)
    INSERT INTO embedding_queue (message_id, content, created_at)
    VALUES (NEW.id, NEW.message_content, now())
    ON CONFLICT (message_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create queue table
CREATE TABLE IF NOT EXISTS embedding_queue (
  message_id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TRIGGER conversation_memory_embedding_trigger
  AFTER INSERT ON conversation_memory
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_embedding();
```

---

## Phase 5: Integration with Mastra Agent

### Updated Agent Configuration

```typescript
// lib/mastra/mastra-agent.ts (UPDATED)
import { Agent } from '@mastra/core/agent';
import { createGateway } from '@ai-sdk/gateway';
import { SupabaseMastraMemory } from './memory/supabase-memory';
import { GearshackUserProfileSchema } from './schemas/working-memory';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY!,
});

export function createGearAgent(
  userId: string,
  systemPrompt: string,
  supabaseClient: SupabaseClient
) {
  // Create unified Supabase memory
  const memory = new SupabaseMastraMemory({
    supabase: supabaseClient,
    userId,

    // Conversation History
    conversationHistory: {
      lastMessages: 20,
    },

    // Working Memory (NEW)
    workingMemory: {
      enabled: true,
      schema: GearshackUserProfileSchema,
      scope: 'resource', // Shared across all conversations
    },

    // Semantic Recall (NEW)
    semanticRecall: {
      enabled: true,
      topK: 5,
      messageRange: 2,
      threshold: 0.7,
      scope: 'resource',
      embedder: gateway.textEmbeddingModel('openai/text-embedding-3-small'),
    },
  });

  const agent = new Agent({
    id: 'gear-assistant',
    name: 'Gear Assistant',
    instructions: systemPrompt,
    model: gateway('anthropic/claude-sonnet-4-5'),
    memory,
    tools: { /* existing tools */ },
  });

  return agent;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/mastra/memory/working-memory.test.ts
describe('Working Memory', () => {
  it('should create default profile for new users', async () => {});
  it('should read existing profile on conversation start', async () => {});
  it('should update profile when agent learns new facts', async () => {});
  it('should validate profile against Zod schema', async () => {});
  it('should persist across conversation threads', async () => {});
});

// __tests__/mastra/memory/semantic-recall.test.ts
describe('Semantic Recall', () => {
  it('should generate embeddings for new messages', async () => {});
  it('should find similar messages by cosine similarity', async () => {});
  it('should include context messages around matches', async () => {});
  it('should respect similarity threshold', async () => {});
  it('should search across all user conversations (resource scope)', async () => {});
});
```

### Integration Tests

```typescript
// __tests__/mastra/memory/memory-integration.test.ts
describe('Three-Tier Memory Integration', () => {
  it('should recall PCT trip from 3 weeks ago when asking about tents', async () => {
    // 1. Create historical conversation mentioning PCT
    // 2. Generate embeddings
    // 3. Start new conversation about tents
    // 4. Verify semantic recall surfaces PCT context
  });

  it('should remember user prefers ultralight gear across sessions', async () => {
    // 1. Conversation where user says "I prefer ultralight"
    // 2. Working memory updated
    // 3. New conversation starts
    // 4. Verify agent references ultralight preference
  });
});
```

---

## Rollout Plan

### Phase 1: Supabase Consolidation (Week 1-2)
- [ ] Remove LibSQL dependency
- [ ] Create Supabase-native memory adapter
- [ ] Update all imports and tests
- [ ] Deploy and verify no regressions

### Phase 2: Working Memory (Week 3-4)
- [ ] Create migration for `user_working_memory` table
- [ ] Implement Zod schema
- [ ] Update agent instructions
- [ ] Test preference learning

### Phase 3: Semantic Recall (Week 5-6)
- [ ] Enable pgvector extension in Supabase
- [ ] Create migration for embedding column + indexes
- [ ] Implement embedding service with Vercel AI Gateway
- [ ] Create semantic search functions

### Phase 4: Backfill & Optimization (Week 7)
- [ ] Run embedding backfill script
- [ ] Monitor embedding generation costs
- [ ] Tune similarity threshold based on quality

### Phase 5: Polish & Documentation (Week 8)
- [ ] Comprehensive testing
- [ ] Update CLAUDE.md with new patterns
- [ ] Create user-facing documentation

---

## Environment Variables

```bash
# .env.local additions

# Already exists
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key

# Remove these (LibSQL)
# LIBSQL_URL=...
# LIBSQL_AUTH_TOKEN=...

# New (optional - for tuning)
SEMANTIC_RECALL_TOP_K=5
SEMANTIC_RECALL_THRESHOLD=0.7
SEMANTIC_RECALL_MESSAGE_RANGE=2
WORKING_MEMORY_ENABLED=true
```

---

## Cost Considerations

### Embedding Costs (text-embedding-3-small)

| Scenario | Messages | Cost |
|----------|----------|------|
| Backfill existing | ~10,000 | ~$0.02 |
| Daily new messages | ~500 | ~$0.001/day |
| Monthly (30 days) | ~15,000 | ~$0.03/month |

**Negligible cost** - text-embedding-3-small is $0.00002/1K tokens.

### Storage Costs (pgvector)

- 1536 dimensions × 4 bytes = 6KB per embedding
- 10,000 messages = 60MB
- Well within Supabase free tier (500MB)

---

## Future Enhancements (Out of Scope)

1. **User Profile UI** - Let users view/edit their working memory profile
2. **Memory Decay** - Reduce confidence of old facts over time
3. **Multi-modal Memory** - Remember images user has shared
4. **Shared Memory** - Group/family memory for shared gear collections

---

## Appendix: File Changes Summary

### New Files
- `lib/mastra/schemas/working-memory.ts`
- `lib/mastra/memory/supabase-memory.ts`
- `lib/mastra/memory/embedding-service.ts`
- `lib/mastra/memory/semantic-recall.ts`
- `scripts/backfill-embeddings.ts`
- `supabase/migrations/YYYYMMDD_working_memory.sql`
- `supabase/migrations/YYYYMMDD_semantic_recall.sql`

### Modified Files
- `lib/mastra/mastra-agent.ts` - Use new memory system
- `lib/mastra/prompt-builder.ts` - Include working memory in prompts
- `app/api/mastra/chat/route.ts` - Pass Supabase client to agent
- `package.json` - Remove `@mastra/libsql`

### Deleted Files
- `lib/mastra/instance.ts` - LibSQL configuration

---

## References

- [Mastra Working Memory Docs](https://mastra.ai/docs/memory/working-memory)
- [Mastra Semantic Recall Docs](https://mastra.ai/en/docs/memory/semantic-recall)
- [Vercel AI Gateway Embeddings](https://vercel.com/ai-gateway/models/text-embedding-3-small)
- [Supabase pgvector Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [AI SDK Embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
