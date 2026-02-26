# AI Assistant (Mastra)

**Status**: ✅ Active
**Framework**: Mastra v1.0+
**Model**: Claude Sonnet 4.5 (Anthropic)
**Version**: Feature 050 + 002-mastra-memory-system + Observational Memory

## Overview

Gearshack's AI Assistant is a Mastra-powered conversational agent that helps users with gear management, loadout optimization, and product recommendations.

**Key Capabilities**:
- 🎒 **Loadout Analysis**: Weight distribution, recommendations, comparisons
- 🔍 **Gear Search**: Find items in inventory, catalog, or web
- 📊 **Analytics**: GearGraph insights, trends, statistics
- 💡 **Recommendations**: Suggest gear based on activity/season/budget
- 🗣️ **Natural Conversation**: Contextual, multi-turn dialogue

---

## Architecture

### Agent Stack

```
User Message
  ↓
/api/mastra/chat (Next.js API Route)
  ↓
Mastra Agent (createGearAgent)
  ├─ System Prompt (dynamic, includes working memory)
  ├─ Four-Tier Memory
  │  ├─ Working Memory (user profile, preferences)
  │  ├─ Message History (last 20 messages)
  │  ├─ Semantic Recall (vector search past conversations)
  │  └─ Observational Memory (compressed context)
  ├─ Tools (4 total)
  │  ├─ queryUserData (SQL queries to user's data)
  │  ├─ queryCatalog (product search in catalog)
  │  ├─ queryGearGraph (analytics/insights)
  │  └─ searchWeb (external search via Serper)
  └─ Model (Claude Sonnet 4.5 via Vercel AI Gateway)
  ↓
Stream Response (SSE)
  ↓
Client (real-time updates)
```

---

## Four-Tier Memory System

### Tier 1: Working Memory (Resource-Scoped)

**Purpose**: Structured user profile the agent can read/update
**Storage**: `working_memory` table in Supabase
**Schema**: Zod-validated JSON

**Data Structure**:
```typescript
interface GearshackUserProfile {
  // Identity
  userName?: string;

  // Preferences
  preferredUnits?: 'metric' | 'imperial';
  preferredWeightUnit?: 'g' | 'kg' | 'oz' | 'lb';
  preferredCurrency?: string;

  // Experience
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  // Activities
  favoriteActivities?: string[]; // ['hiking', 'backpacking', 'climbing']
  primarySeason?: 'spring' | 'summer' | 'fall' | 'winter';

  // Gear Preferences
  gearPreferences?: {
    preferredBrands?: string[];
    avoidedBrands?: string[];
    budgetRange?: [number, number];
    weightPriority?: 'ultralight' | 'balanced' | 'comfort';
  };

  // Goals
  recentGoals?: string[];
  currentProject?: string;

  // Constraints
  physicalLimitations?: string[];
  dietaryRestrictions?: string[];
}
```

**Update Pattern**:
```typescript
// Agent can update working memory via system instruction
"You can update user preferences by modifying the working memory.
Example: If user says 'I prefer metric units', update:
{ preferredUnits: 'metric' }"
```

**Persistence**: Across all conversations (resource-scoped)

---

### Tier 2: Message History (Thread-Scoped)

**Purpose**: Recent conversation context
**Storage**: `conversation_memory` table
**Retention**: Last 20 messages per thread

**Why 20 messages?**
- Balances context and performance
- ~10 user/assistant turns
- Prevents context bloat

**Structure**:
```typescript
interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  created_at: Date;
}
```

**Pruning**: Automatic - oldest messages dropped when > 20

---

### Tier 3: Semantic Recall (Resource-Scoped)

**Purpose**: Find relevant past conversations via vector similarity
**Storage**: `conversation_memory.embedding` (pgvector)
**Embeddings**: OpenAI text-embedding-3-small (1536 dims)

**How It Works**:
1. User sends message
2. Message embedded → 1536-dim vector
3. Vector search in past conversations
4. Top-K most similar messages retrieved (K=5)
5. Included in agent context

**Index**: HNSW (Hierarchical Navigable Small World)
```sql
CREATE INDEX idx_conversation_memory_embedding
  ON conversation_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Configuration**:
- `topK`: 5 (max similar messages)
- `threshold`: 0.7 (min similarity score)
- `messageRange`: 2 (context around match)

**Use Case**:
```
User: "What jacket did I buy last year?"
→ Vector search finds conversation from 6 months ago
→ "You purchased the Arc'teryx Alpha SV in November 2025"
```

---

### Tier 4: Observational Memory (Thread-Scoped)

**Purpose**: Compress tool-heavy conversations
**Status**: ✅ Active (see [Observational Memory docs](observational-memory.md))
**Model**: google/gemini-2.5-flash
**Compression**: 5-40× typical

**How It Works**:
1. When messages exceed 20k tokens → Observer runs
2. Observer creates dense observations
3. When observations exceed 40k tokens → Reflector runs
4. Reflector condenses observations

**Example**:
```
Input (5k tokens):
  queryUserData result: [50 gear items with full specs...]

Output (100 tokens):
  🔴 User has 50 gear items:
     - 15 backpacks (mostly ultralight: Hyperlite, Gossamer Gear)
     - 12 jackets (Arc'teryx, Patagonia, synthetic insulation)
     - 8 sleeping bags (temp range -5°C to +15°C)
```

**Benefits**:
- Longer conversations (50+ turns)
- Better tool result handling
- 30-50% cost reduction

---

## Tools

The agent has 4 tools for querying data and performing actions.

### 1. queryUserData

**Purpose**: SQL queries against user's data
**Access**: Read-only (SELECT queries only)
**Tables**: `gear_items`, `loadouts`, `loadout_items`, `profiles`

**Parameters**:
```typescript
{
  sql: string; // SQL query with {userId} placeholder
}
```

**Example Usage**:
```sql
-- Find all backpacks
SELECT * FROM gear_items
WHERE user_id = {userId}
  AND category = 'backpacks'
ORDER BY weight ASC;

-- Loadout total weight
SELECT
  l.name,
  SUM(g.weight * li.quantity) as total_weight
FROM loadouts l
JOIN loadout_items li ON l.id = li.loadout_id
JOIN gear_items g ON li.gear_item_id = g.id
WHERE l.user_id = {userId}
  AND l.id = 'loadout-uuid'
GROUP BY l.id;
```

**Security**:
- RLS policies enforced (user can only see own data)
- Read-only mode (no INSERT/UPDATE/DELETE)
- SQL injection protection via parameterized queries

**Common Queries**:
- List gear by category
- Find items by brand
- Calculate loadout weight
- Compare loadout costs
- Filter by status (inventory/wishlist)

---

### 2. queryCatalog

**Purpose**: Search product catalog for recommendations
**Access**: Read-only
**Tables**: `catalog_items`, `catalog_brands`, `categories`

**Parameters**:
```typescript
{
  query: string; // Natural language search
  category?: string; // Filter by category
  brand?: string; // Filter by brand
  maxPrice?: number; // Price limit
  limit?: number; // Result count (default 10)
}
```

**Features**:
- **Fuzzy matching**: Trigram similarity for typos
- **Vector search**: Semantic similarity via embeddings
- **Filtering**: Category, brand, price range
- **Ranking**: Relevance score + popularity

**Example**:
```typescript
await queryCatalog({
  query: "ultralight down jacket for winter",
  category: "jackets",
  maxPrice: 500,
  limit: 5
});

// Returns:
[
  {
    name: "Arc'teryx Cerium LT Hoody",
    brand: "Arc'teryx",
    weight: 305,
    price: 449,
    similarity_score: 0.89
  },
  // ... 4 more
]
```

---

### 3. queryGearGraph

**Purpose**: Analytics and insights via GearGraph
**Access**: Read-only
**Features**: Category analysis, weight distribution, brand trends

**Parameters**:
```typescript
{
  analysisType: 'weight_by_category' | 'items_by_brand' | 'loadout_comparison';
  filters?: {
    loadoutId?: string;
    category?: string;
    minWeight?: number;
    maxWeight?: number;
  };
}
```

**Analysis Types**:

**weight_by_category**:
```json
{
  "results": [
    {"category": "shelter", "total_weight": 1250, "item_count": 3},
    {"category": "sleep_system", "total_weight": 980, "item_count": 2},
    {"category": "backpack", "total_weight": 850, "item_count": 1}
  ],
  "total_weight": 3080,
  "recommendations": ["Consider lighter shelter options"]
}
```

**items_by_brand**:
```json
{
  "results": [
    {"brand": "Arc'teryx", "item_count": 8, "avg_weight": 420},
    {"brand": "Hyperlite", "item_count": 5, "avg_weight": 180}
  ],
  "insights": ["You prefer technical brands with mid-range weight"]
}
```

**loadout_comparison**:
```json
{
  "loadouts": [
    {
      "name": "Summer Alps 2025",
      "total_weight": 4500,
      "item_count": 28,
      "weight_by_category": {...}
    },
    {
      "name": "Winter Norway 2026",
      "total_weight": 8200,
      "item_count": 35,
      "weight_by_category": {...}
    }
  ],
  "comparison": {
    "weight_difference": 3700,
    "added_items": ["insulated jacket", "warmer sleeping bag"],
    "removed_items": ["shorts", "sandals"]
  }
}
```

---

### 4. searchWeb

**Purpose**: External web search via Serper.dev
**Access**: Google Search API
**Use Cases**: Product availability, reviews, trail conditions, weather

**Parameters**:
```typescript
{
  query: string; // Search term
  type?: 'web' | 'images' | 'news'; // Default: web
  limit?: number; // Default: 5
}
```

**Response**:
```json
{
  "results": [
    {
      "title": "Arc'teryx Alpha SV Review | Outdoor Gear Lab",
      "url": "https://...",
      "snippet": "After months of testing...",
      "domain": "outdoorgearlab.com"
    }
  ]
}
```

**Rate Limiting**: 100 requests/day per user

---

## System Prompt

The agent's system prompt is **dynamic** - it includes working memory context.

**Structure**:
```typescript
const systemPrompt = `
You are a helpful outdoor gear assistant for Gearshack.

# User Profile
${workingMemoryContext}

# Your Capabilities
- Analyze gear and loadouts
- Recommend products
- Answer questions about user's inventory
- Provide insights via GearGraph

# Guidelines
- Be concise and actionable
- Use metric/imperial based on user preference
- Suggest specific products from catalog
- Always include weight when discussing gear
- Format weights: ${weightUnit} (based on user pref)

# Tools
You have 4 tools:
1. queryUserData - SQL queries to user's data
2. queryCatalog - Search product catalog
3. queryGearGraph - Analytics and insights
4. searchWeb - External search

# Conversation Style
- Friendly but professional
- Use outdoor terminology correctly
- Acknowledge user's experience level
- Don't overwhelm beginners
`;
```

**Working Memory Injection**:
```typescript
const workingMemoryContext = `
Name: ${profile.userName}
Experience: ${profile.experienceLevel}
Preferred Units: ${profile.preferredUnits}
Favorite Activities: ${profile.favoriteActivities?.join(', ')}
Weight Priority: ${profile.gearPreferences?.weightPriority}
`;
```

---

## API Routes

### POST /api/mastra/chat

**Purpose**: Send message to agent, receive streaming response

**Request**:
```typescript
{
  message: string;
  thread_id?: string; // Optional, creates new thread if omitted
  conversation_history?: Message[]; // Client-side context for continuity
}
```

**Response**: Server-Sent Events (SSE)
```
event: text
data: {"content":"Let me"}

event: text
data: {"content":" check your"}

event: tool_call
data: {"name":"queryUserData","args":{"sql":"..."}}

event: tool_result
data: {"result":[...]}

event: text
data: {"content":" gear. You have"}

event: done
data: {"finish_reason":"stop"}
```

**Error Handling**:
```typescript
try {
  const stream = await fetch('/api/mastra/chat', {
    method: 'POST',
    body: JSON.stringify({ message, thread_id }),
  });
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Show rate limit message
  } else if (error.code === 'CONTEXT_LENGTH') {
    // Suggest starting new thread
  }
}
```

---

### GET /api/mastra/history

**Purpose**: Retrieve conversation history for a thread

**Request**:
```typescript
GET /api/mastra/history?thread_id=...&limit=20
```

**Response**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Show me my backpacks",
      "created_at": "2026-02-06T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "You have 3 backpacks...",
      "tool_calls": [...],
      "created_at": "2026-02-06T10:00:02Z"
    }
  ],
  "thread_id": "...",
  "total_messages": 42
}
```

---

### GET /api/mastra/metrics

**Purpose**: Usage metrics and costs

**Request**:
```typescript
GET /api/mastra/metrics?user_id=...&from=...&to=...
```

**Response**:
```json
{
  "total_requests": 123,
  "total_tokens": 456789,
  "total_cost": 1.37,
  "by_model": {
    "claude-sonnet-4-5": {
      "requests": 100,
      "tokens": 400000,
      "cost": 1.20
    },
    "gemini-2.5-flash": {
      "requests": 23,
      "tokens": 56789,
      "cost": 0.17
    }
  },
  "by_tool": {
    "queryUserData": 45,
    "queryCatalog": 30,
    "queryGearGraph": 15,
    "searchWeb": 8
  }
}
```

---

## Client Integration

### React Hook: useAIAssistant

```typescript
import { useAIAssistant } from '@/hooks/ai-assistant/useAIAssistant';

function ChatComponent() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    startNewThread,
  } = useAIAssistant();

  const handleSubmit = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {messages.map((msg) => (
        <Message key={msg.id} {...msg} />
      ))}
      {isLoading && <LoadingIndicator />}
      <ChatInput onSubmit={handleSubmit} />
    </div>
  );
}
```

---

## Rate Limiting

### Limits

- **Requests**: 100/hour per user
- **Tokens**: 1M/day per user
- **Web Search**: 100/day per user

### Implementation

Uses `p-queue` for client-side throttling:
```typescript
import PQueue from 'p-queue';
const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 2 });
```

### Error Response

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "You've exceeded 100 requests per hour",
  "retry_after": 3600
}
```

---

## Cost Optimization

### Strategies

1. **Observational Memory**: 30-50% reduction via compression
2. **Prompt Caching**: Stable observations → cacheable prefix
3. **Model Selection**:
   - Chat: Claude Sonnet 4.5 ($3/1M input tokens)
   - Observer/Reflector: Gemini 2.5 Flash ($0.25/1M tokens)
   - Embeddings: OpenAI text-embedding-3-small ($0.02/1M tokens)
4. **Smart Tool Use**: Agent only calls tools when necessary
5. **Streaming**: Perceived performance without extra cost

### Cost Breakdown (Typical 20-Turn Conversation)

| Component | Tokens | Cost |
|-----------|--------|------|
| Chat (Claude Sonnet) | 15,000 | $0.045 |
| Observer (Gemini Flash) | 2,000 | $0.0005 |
| Embeddings (OpenAI) | 5,000 | $0.0001 |
| **Total** | **22,000** | **$0.0456** |

**Without OM**: ~95k tokens = $0.285 (6× more expensive)

---

## Monitoring

### Mastra Studio

See [Mastra Studio Guide](../guides/mastra-studio.md)

**Key Metrics**:
- Token usage by conversation
- Tool call frequency
- Response latency
- Error rate
- Cost attribution

### OpenTelemetry

Distributed tracing for debugging:
```
/api/mastra/chat
├─ Mastra Agent.stream()
│  ├─ Load Memory (120ms)
│  │  ├─ PostgresStore.getMessages() (45ms)
│  │  ├─ PgVector.search() (62ms)
│  │  └─ Load Observations (13ms)
│  ├─ Claude API call (2100ms)
│  │  └─ 4 tool calls (1300ms)
│  └─ Save to Memory (85ms)
```

---

## Best Practices

### For Developers

1. **Use streaming**: Better UX, no extra cost
2. **Implement rate limiting**: Protect against abuse
3. **Monitor costs**: Track per-user token usage
4. **Handle errors gracefully**: Network issues, API errors, etc.
5. **Test with Mastra Studio**: Debug memory, tool calls

### For Users

1. **Be specific**: "Show backpacks under 1kg" > "Show light backpacks"
2. **Use context**: Agent remembers recent conversation
3. **Start new thread**: If conversation drifts, start fresh
4. **Provide feedback**: Help improve responses

---

## Troubleshooting

### Agent not responding

**Check**:
1. Supabase connection (DATABASE_URL)
2. AI Gateway API key
3. Rate limits not exceeded
4. No errors in Mastra Studio

### Wrong tool called

**Fix**: Improve system prompt or tool description

**Example**:
```typescript
// Bad
description: "Search for data"

// Good
description: "Query user's gear items and loadouts from their inventory database"
```

### High costs

**Monitor**:
- Token usage in Mastra Studio
- Observational Memory compression ratio
- Unnecessary tool calls

**Fix**:
- Adjust OM thresholds
- Optimize tool descriptions
- Use cheaper models for Observer

### Slow responses

**Check**:
- Observer/Reflector running? (background, doesn't block)
- Tool queries optimized? (add indexes)
- Network latency to API

**Fix**:
- Add database indexes
- Use connection pooling
- Consider caching catalog queries

---

## Future Improvements

- [ ] **Voice Input**: Transcribe audio via Whisper
- [ ] **Image Analysis**: Identify gear from photos
- [ ] **Multi-Agent**: Specialized agents (nutrition, weather, routes)
- [ ] **Proactive Suggestions**: "Your winter loadout is heavy, want tips?"
- [ ] **Integration**: Calendar for trip planning, weather APIs

---

## Related Docs

- [Observational Memory](observational-memory.md)
- [Mastra Studio Guide](../guides/mastra-studio.md)
- [System Architecture](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)

---

**Last Updated**: 2026-02-06
**Model**: Claude Sonnet 4.5
**Framework**: Mastra v1.0+
**Status**: Production-Ready
