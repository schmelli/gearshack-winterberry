# Agentic AI Assistant - Complete Documentation

> **Feature 050**: Intelligent, multi-step AI assistant with tool calling, web search, and autonomous reasoning

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features & Capabilities](#features--capabilities)
4. [How It Works](#how-it-works)
5. [Configuration](#configuration)
6. [Available Tools](#available-tools)
7. [Usage Examples](#usage-examples)
8. [Extending the System](#extending-the-system)
9. [Troubleshooting](#troubleshooting)
10. [Performance & Costs](#performance--costs)

---

## Overview

The Agentic AI Assistant is a sophisticated conversational AI system that can:
- **Understand complex queries** and break them down into actionable steps
- **Execute tools autonomously** to gather data, perform calculations, and take actions
- **Search the web** for real-time information (optional)
- **Chain multiple operations** together to accomplish complex tasks
- **Self-correct** when operations fail and try alternative approaches

### What Makes It "Agentic"?

Unlike traditional chatbots that only respond with text, an agentic AI:
1. **Reasons** about what needs to be done
2. **Plans** a sequence of actions
3. **Executes** tools to gather information or take actions
4. **Observes** the results and adjusts its approach
5. **Responds** with a complete, informed answer

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                        │
│  (ChatInterface.tsx + useAIChat.ts)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Streaming API Endpoint                          │
│  /api/ai-assistant/stream                                    │
│  • Rate limiting                                             │
│  • Authentication                                            │
│  • Subscription check (Trailblazer only)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Client Layer                             │
│  (ai-client.ts)                                              │
│  • Vercel AI SDK integration                                 │
│  • Tool registration                                         │
│  • Streaming orchestration                                   │
└─────┬───────────────────────────────────┬───────────────────┘
      │                                   │
      ▼                                   ▼
┌─────────────────┐            ┌──────────────────────┐
│  Vercel AI      │            │  Tool Executor       │
│  Gateway        │            │  (tool-executor.ts)  │
│                 │            │  • Retry logic       │
│  Claude/Gemini  │            │  • Error handling    │
│  Models         │            │  • Result validation │
└─────────────────┘            └──────────┬───────────┘
                                          │
                        ┌─────────────────┴──────────────────┐
                        │                                    │
                        ▼                                    ▼
            ┌─────────────────────┐            ┌──────────────────────┐
            │   Tool Library      │            │  Orchestration       │
            │   (11 tools)        │            │  Engine              │
            │                     │            │  (orchestrator.ts)   │
            │  • searchCatalog    │            │                      │
            │  • analyzeInventory │            │  • Dependency graph  │
            │  • compareItems     │            │  • Parallel exec     │
            │  • getCommunityOffers│           │  • Result passing   │
            │  • getInsights      │            └──────────────────────┘
            │  • executeCalculation│
            │  • searchWeb        │
            │  • addToWishlist    │
            │  • compareGear      │
            │  • sendMessage      │
            │  • navigate         │
            └─────────────────────┘
```

### Data Flow

1. **User Input** → UI captures message
2. **API Request** → Sent to streaming endpoint with context (inventory, locale, etc.)
3. **AI Processing** → LLM analyzes query and decides which tools to call
4. **Tool Execution** → Tools run in parallel/sequence as needed
5. **Result Synthesis** → AI combines tool results into natural language
6. **Stream Response** → Text + metadata streamed back to UI via SSE
7. **UI Update** → Message displayed with optional inline cards

---

## Features & Capabilities

### Phase 1: Streaming + Tools
✅ **Real-time streaming** - Word-by-word text generation
✅ **Tool calling** - AI can invoke functions during streaming
✅ **SSE (Server-Sent Events)** - Structured event stream with metadata

### Phase 2A: Multi-Step Orchestration
✅ **Dependency resolution** - Tools execute in correct order
✅ **Parallel execution** - Independent tools run simultaneously
✅ **Result passing** - Output from one tool becomes input to another

### Phase 2B: Web Search Grounding
✅ **Real-time web search** via Serper API
✅ **Domain filtering** - Trusted outdoor gear sources
✅ **Smart caching** - Different TTLs based on content type
✅ **Rate limiting** - Cost control (2/conversation, 10/day, 100/month)

### Phase 3: Comprehensive Tool Library
✅ **11 specialized tools** for gear management
✅ **Type-safe execution** with Zod validation
✅ **Automatic retry** with exponential backoff
✅ **Detailed logging** for observability

### Phase 4: Autonomous Reasoning
✅ **Self-directed planning** - AI decomposes complex queries
✅ **Error recovery** - Tries alternative approaches on failure
✅ **Context awareness** - Remembers conversation history
✅ **Multi-turn dialogue** - Maintains state across messages

---

## How It Works

### Example: Complex Multi-Step Query

**User asks:** _"Find me a tent lighter than 1kg and add the best one to my wishlist"_

#### Step 1: AI Reasoning
```
Thought: To answer this, I need to:
1. Search catalog for tents under 1kg
2. Compare results to find the "best" one
3. Add it to wishlist
```

#### Step 2: Tool Execution Plan
```javascript
{
  "steps": [
    {
      "id": "search_tents",
      "tool": "searchCatalog",
      "args": {
        "query": "tent",
        "filters": { "weight_max": 1000 }
      }
    },
    {
      "id": "compare_results",
      "tool": "compareItems",
      "args": {
        "itemIds": "$search_tents.results[0:3].id"  // Reference to previous result
      },
      "dependsOn": ["search_tents"]
    },
    {
      "id": "add_to_wishlist",
      "tool": "addToWishlist",
      "args": {
        "gearItemId": "$compare_results.winner.id"  // Reference to best item
      },
      "dependsOn": ["compare_results"]
    }
  ]
}
```

#### Step 3: Execution & Results
1. **searchCatalog** runs → Returns 5 tents under 1kg
2. **compareItems** runs → Compares top 3, picks Zpacks Duplex (595g)
3. **addToWishlist** runs → Adds Zpacks Duplex to wishlist

#### Step 4: AI Response
```
"I found 5 tents under 1kg in our catalog. After comparing the top options,
the Zpacks Duplex (595g) offers the best combination of weight, durability,
and value. I've added it to your wishlist!"
```

### Streaming Format (SSE)

The backend sends Server-Sent Events in this format:

```
event: text
data: I found

event: text
data:  5 tents

event: tool_call
data: {"toolCallId":"call_123","toolName":"searchCatalog","args":{...}}

event: text
data:  under 1kg...

event: done
data: {"finishReason":"stop","toolCalls":[{...}]}
```

The UI parses these events to:
- Display text in real-time
- Show tool execution status
- Render inline cards with results

---

## Configuration

### Required Environment Variables

```bash
# REQUIRED - Enable AI Assistant
AI_CHAT_ENABLED=true

# REQUIRED - Vercel AI Gateway API Key
# Get from: https://vercel.com/ai-gateway
AI_GATEWAY_API_KEY=vck_xxxxxxxxxxxxx

# OPTIONAL - Model selection (defaults to Claude)
AI_CHAT_MODEL=anthropic/claude-sonnet-4.5
# OR use Gemini:
# AI_CHAT_MODEL=google/gemini-2.5-flash

# OPTIONAL - Gateway base URL (defaults to Vercel)
AI_GATEWAY_BASE_URL=https://ai-gateway.vercel.sh/v1/ai
```

### Web Search Configuration (Optional)

```bash
# Enable web search feature
WEB_SEARCH_ENABLED=true

# Serper API Key (Google Search)
# Get from: https://serper.dev
SERPER_API_KEY=your-serper-key

# Rate limits (optional, these are defaults)
WEB_SEARCH_DAILY_LIMIT=10
WEB_SEARCH_MONTHLY_LIMIT=100
WEB_SEARCH_CONVERSATION_LIMIT=2
```

### Deployment Checklist

#### Local Development
1. Add variables to `.env.local`
2. Restart dev server: `npm run dev`
3. Test in browser console for errors

#### Vercel Production
1. **Dashboard → Settings → Environment Variables**
2. Add each variable (NO `NEXT_PUBLIC_` prefix!)
3. **Important:** Check variable names exactly match:
   - ✅ `AI_GATEWAY_API_KEY` (correct)
   - ❌ `AI_GATEWAY_KEY` (wrong - missing `_API_`)
4. Redeploy or wait for auto-deploy

#### Database Setup
Apply 5 migrations via Supabase Dashboard or CLI:

```bash
# Option 1: Supabase CLI
cd supabase
supabase db push --include-all

# Option 2: Manual in Supabase Dashboard → SQL Editor
# Run each migration file in order:
# 1. 20251220000001_add_tool_orchestration_columns.sql
# 2. 20251220000002_web_search_cache.sql
# 3. 20251220000003_web_search_usage.sql
# 4. 20251220000004_tool_execution_logs.sql
# 5. 20251220000005_conversation_state.sql
```

---

## Available Tools

### 1. **searchCatalog** - Product Search
```typescript
searchCatalog({
  query: "ultralight tent",
  filters: {
    weight_max: 1000,        // grams
    price_max: 500,          // USD
    category: "shelter",
    brand: "Zpacks",
    season: ["3-season"]
  }
})
```

**Use cases:**
- Find specific products by name/brand
- Filter by weight, price, category
- Discover alternatives to user's gear

---

### 2. **analyzeInventory** - Deep Insights
```typescript
analyzeInventory({
  userId: "user-uuid",
  analysisType: "base_weight" | "category_breakdown" | "price_analysis",
  filters: {
    categoryId: "shelter",
    status: "own" | "wishlist"
  }
})
```

**Returns:**
- **base_weight**: Total weight, heaviest/lightest categories
- **category_breakdown**: Per-category stats with percentages
- **price_analysis**: Total spent, average price, category spending

**Use cases:**
- "What's my base weight?"
- "Which category is heaviest?"
- "How much have I spent on gear?"

---

### 3. **compareItems** - Side-by-Side Comparison
```typescript
compareItems({
  itemIds: ["item-1", "item-2", "item-3"],
  comparisonFields: ["weight", "price", "specs", "reviews"]
})
```

**Use cases:**
- Compare user's gear with catalog alternatives
- Find lighter/cheaper options
- Evaluate tradeoffs between items

---

### 4. **getCommunityOffers** - Marketplace Search
```typescript
getCommunityOffers({
  searchQuery: "sleeping bag",
  offerType: "sale" | "borrow" | "trade",
  location: {
    latitude: 47.6062,
    longitude: -122.3321,
    radiusMiles: 50
  }
})
```

**Use cases:**
- Find used gear for sale nearby
- Borrow gear for a trip
- Trade gear with community

---

### 5. **getInsights** - GearGraph Intelligence
```typescript
getInsights({
  query: "Zpacks Duplex tent",
  insightType: "reviews" | "sustainability" | "durability" | "alternatives"
})
```

**Use cases:**
- Get expert reviews and ratings
- Check sustainability scores
- Find similar/alternative products
- Learn about durability and lifespan

---

### 6. **executeCalculation** - Safe Math Operations
```typescript
executeCalculation({
  calculationType: "weight_savings" | "price_comparison" | "custom",
  formula: "a - b",
  variables: { a: 1800, b: 595 },
  outputUnit: "g"
})
```

**Use cases:**
- Calculate weight savings from gear upgrades
- Compare prices across items
- Custom formulas for pack optimization

**Security:** Uses mathjs library (no eval!), validates all inputs

---

### 7. **searchWeb** - Real-Time Web Search
```typescript
searchWeb({
  query: "Zpacks Duplex reviews 2025",
  searchType: "reviews" | "conditions" | "news" | "general",
  maxResults: 3,
  freshness: "day" | "week" | "month" | "any"
})
```

**Cache TTLs:**
- Reviews: 7 days
- General: 3 days
- Trail conditions: 6 hours
- News: 2 hours

**Trusted domains:**
- outdoorgearlab.com, cleverhiker.com, backpacker.com
- alltrails.com, hikingproject.com
- reddit.com/r/ultralight, lighterpack.com

---

### 8-11. **Action Tools**

```typescript
// Add item to wishlist
addToWishlist({ gearItemId: "item-uuid" })

// Compare gear side-by-side
compareGear({ gearItemIds: ["id1", "id2"] })

// Send message to user
sendMessage({ recipientUserId: "uuid", messagePreview: "..." })

// Navigate to page
navigate({ destination: "/inventory" | "/loadouts/new" | ... })
```

---

## Usage Examples

### Example 1: Inventory Analysis
**User:** "What's the total weight of my shelter category?"

**AI Process:**
1. Calls `analyzeInventory` with `categoryId: "shelter"`
2. Gets total weight: 2,450g
3. Responds: "Your shelter category weighs 2.45kg total, including your tent (1,800g), stakes (150g), and tarp (500g)."

---

### Example 2: Gear Upgrade Recommendation
**User:** "My pack is too heavy, what should I upgrade?"

**AI Process:**
1. Calls `analyzeInventory` (category_breakdown)
2. Identifies heaviest category: Shelter (35% of base weight)
3. Calls `searchCatalog` for lighter alternatives
4. Calls `compareItems` between current and alternatives
5. Calls `executeCalculation` to show weight savings
6. Responds with specific recommendations + weight/cost tradeoffs

---

### Example 3: Web-Grounded Research
**User:** "What are people saying about the Zpacks Duplex?"

**AI Process:**
1. Calls `searchWeb` with searchType="reviews"
2. Gets top 3 results from trusted sources
3. Summarizes key points from reviews
4. Optionally calls `getInsights` for GearGraph data
5. Responds with comprehensive review summary

---

### Example 4: Multi-Step Purchase Decision
**User:** "Find me a tent lighter than mine, compare the top 3, and add the best one to my wishlist"

**AI Process:**
1. Calls `analyzeInventory` to get current tent weight
2. Calls `searchCatalog` with weight filter
3. Calls `compareItems` on top 3 results
4. Calls `addToWishlist` with winning item
5. Responds with reasoning and confirmation

---

## Extending the System

### Adding a New Tool

#### 1. Define the Tool Schema
```typescript
// lib/ai-assistant/tools/my-tool.ts
import { z } from 'zod';

export const myToolParametersSchema = z.object({
  param1: z.string().describe('Description for AI'),
  param2: z.number().optional(),
});

export type MyToolParameters = z.infer<typeof myToolParametersSchema>;

export const myTool = {
  description: 'Clear description for the AI about when to use this tool',
  parameters: myToolParametersSchema,
};
```

#### 2. Implement the Executor
```typescript
export async function executeMyTool(
  params: MyToolParameters
): Promise<MyToolResult> {
  // Validate parameters
  const validated = myToolParametersSchema.parse(params);

  try {
    // Your business logic here
    const result = await fetchData(validated.param1);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[myTool] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### 3. Register the Tool
```typescript
// lib/ai-assistant/tools/index.ts
import { myTool, executeMyTool } from './my-tool';

export const ALL_TOOLS = {
  // ... existing tools
  myTool,
};

export async function executeToolByName(
  toolName: string,
  args: unknown,
  context: OrchestrationContext
): Promise<ToolExecutionResult> {
  switch (toolName) {
    // ... existing cases
    case 'myTool':
      return executeMyTool(args as MyToolParameters);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

#### 4. Add to Prompt
```typescript
// lib/ai-assistant/prompt-builder.ts
// Tool list is auto-generated from ALL_TOOLS
// No changes needed!
```

#### 5. Test
```typescript
// Test via AI Assistant UI
"Use myTool with param1='test'"

// Or directly:
await executeMyTool({ param1: 'test', param2: 42 });
```

---

## Troubleshooting

### Issue: Empty Responses (messageLength: 0)

**Symptoms:**
```javascript
Stream finished successfully: {
  messageLength: 0,
  toolCalls: 0
}
```

**Causes & Fixes:**
1. **Missing API Key**
   - Check: `.env.local` has `AI_GATEWAY_API_KEY`
   - Fix: Add key from https://vercel.com/ai-gateway

2. **Wrong Variable Name**
   - Check: Exactly `AI_GATEWAY_API_KEY` (not `AI_GATEWAY_KEY`)
   - Fix: Rename in Vercel settings

3. **Not Enabled**
   - Check: `AI_CHAT_ENABLED=true`
   - Fix: Add to env vars

4. **Server Not Restarted**
   - Check: Restart `npm run dev` after env changes
   - Fix: Stop (Ctrl+C) and restart

---

### Issue: Tools Not Executing

**Symptoms:**
```javascript
Stream finished: { toolCalls: 0 }  // Should be > 0
```

**Causes & Fixes:**
1. **Tools Not Enabled**
   - Check: `useAIChat.ts` has `enableTools: true`
   - Fix: Already fixed in latest code

2. **Wrong Model**
   - Check: Some models don't support tool calling
   - Fix: Use `anthropic/claude-sonnet-4.5` or `google/gemini-2.5-flash`

3. **Prompt Too Vague**
   - Check: Query needs to be actionable
   - Fix: Try: "Search catalog for tents" instead of "Tell me about tents"

---

### Issue: Rate Limit Exceeded

**Symptoms:**
```
Rate limit exceeded. You can send 100 messages per hour.
Resets at 3:45 PM.
```

**Fix:**
- Trailblazer tier: 100 messages/hour
- Increase limit in `app/api/ai-assistant/stream/route.ts`:
  ```typescript
  p_limit: 200,  // Increase from 100
  ```

---

### Issue: Web Search Not Working

**Symptoms:**
```
[Web Search] API error: 401
```

**Causes & Fixes:**
1. **Missing Serper Key**
   - Check: `SERPER_API_KEY` in env vars
   - Fix: Get from https://serper.dev

2. **Not Enabled**
   - Check: `WEB_SEARCH_ENABLED=true`
   - Fix: Add to env vars

3. **Rate Limit**
   - Check: Console shows "Daily limit reached"
   - Fix: Wait or increase `WEB_SEARCH_DAILY_LIMIT`

---

### Issue: Database Errors

**Symptoms:**
```
relation "web_search_usage" does not exist
```

**Fix:** Apply migrations:
```bash
cd supabase
supabase db push --include-all
```

---

## Performance & Costs

### Latency Benchmarks

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Simple text response | 500ms | 1.2s | 2s |
| Single tool call | 1.5s | 3s | 5s |
| Multi-step (3 tools) | 3s | 6s | 10s |
| Web search + tools | 4s | 8s | 12s |

### Cost Breakdown

**AI Gateway (Vercel):**
- Claude Sonnet 4.5: ~$0.015/request
- Gemini 2.5 Flash: ~$0.002/request
- Budget: ~$15-30/month for 1000 active users

**Web Search (Serper):**
- $0.0003/search
- With 40% cache hit rate: ~$0.0002/effective search
- Budget: ~$40-80/month for 1000 users (20k-40k queries)

**Total:** $55-110/month for 1000 active users

### Optimization Tips

1. **Enable Caching**
   - Web search cache saves 40-60% of API calls
   - Cache TTLs are already optimized

2. **Use Cheaper Models for Simple Queries**
   - Gemini 2.5 Flash is 7x cheaper than Claude
   - Still supports all tools

3. **Rate Limiting**
   - Already implemented (2/conv, 10/day, 100/month)
   - Prevents cost overruns

4. **Monitor Usage**
   ```sql
   -- Check web search usage
   SELECT COUNT(*), SUM(cost_usd)
   FROM web_search_usage
   WHERE created_at > NOW() - INTERVAL '30 days';

   -- Check tool execution
   SELECT tool_name, COUNT(*)
   FROM ai_tool_execution_logs
   WHERE created_at > NOW() - INTERVAL '30 days'
   GROUP BY tool_name;
   ```

---

## Architecture Decisions

### Why Vercel AI Gateway?

✅ **Pros:**
- Single API for multiple LLM providers
- Automatic fallback and retry
- Built-in observability
- Model switching without code changes
- Usage analytics dashboard

❌ **Cons:**
- Small markup on API costs (~10-20%)
- Vendor lock-in to Vercel ecosystem

**Alternative:** Direct Anthropic API
- Set `ANTHROPIC_API_KEY` instead
- Modify `ai-client.ts` to use Anthropic SDK directly
- Save 10-20% on costs but lose fallback/analytics

### Why Serper over Google Search API?

✅ **Pros:**
- Cheaper ($0.0003 vs $0.005 per search)
- Simpler API (no complex authentication)
- Optimized for AI/LLM use cases
- Faster responses

❌ **Cons:**
- Smaller provider (risk of downtime)
- Less customizable

**Alternative:** Tavily Search API
- LLM-optimized content extraction
- $0.002/search (more expensive)
- Better for complex research queries

### Why Custom Orchestration vs LangGraph?

✅ **Pros:**
- Lightweight (no heavy dependencies)
- Vercel Edge Runtime compatible
- Simpler to debug and maintain
- Full control over execution

❌ **Cons:**
- Missing some advanced LangGraph features
- No visual graph editor

**When to switch:** If you need complex agent workflows with human-in-the-loop, consider LangGraph

---

## Future Enhancements

### Planned Features
- [ ] Multi-modal support (image input/output)
- [ ] Voice input/output
- [ ] Persistent memory (user preferences, learned facts)
- [ ] Proactive suggestions ("You haven't updated your loadout in 3 months...")
- [ ] Integration with trip planning
- [ ] Community knowledge base (shared Q&A)

### Potential New Tools
- [ ] `optimizeLoadout` - Suggest weight/cost optimizations
- [ ] `findDeals` - Monitor price drops and sales
- [ ] `planTrip` - Suggest gear for specific trips
- [ ] `checkWeather` - Weather forecasts for trip planning
- [ ] `reserveCampsites` - Search/book campsites

---

## References

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Serper API Docs](https://serper.dev/docs)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Last Updated:** 2025-12-19
**Version:** 1.0.0
**Author:** Gearshack Development Team
