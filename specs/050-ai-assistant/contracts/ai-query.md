# API Contract: AI Query (sendAIMessage)

**Feature**: 050-ai-assistant | **Contract Type**: Server Action | **Date**: 2025-12-16

## Overview

Server Action that sends user messages to the AI backend and streams responses back to the client. Handles rate limiting, context injection, graceful degradation, and multi-session synchronization.

## Endpoint

**Server Action**: `sendAIMessage`

**File Location**: `app/[locale]/ai-assistant/actions.ts`

**Pattern**: Next.js Server Action with streaming response via `createStreamableValue`

---

## Request Contract

### Input Parameters

```typescript
interface SendAIMessageInput {
  conversationId: string; // UUID of existing conversation
  messageContent: string; // User's message text (1-2000 chars)
  context: UserContext; // Current user context
}

interface UserContext {
  screen: string; // Current screen identifier (e.g., "inventory", "loadout-detail")
  locale: 'en' | 'de'; // User's selected language
  inventoryCount: number; // Total gear items in user's inventory
  currentLoadoutId?: string; // UUID if user is viewing a loadout
}
```

### Validation Rules (Zod Schema)

```typescript
const SendAIMessageInputSchema = z.object({
  conversationId: z.string().uuid(),
  messageContent: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 chars)'),
  context: z.object({
    screen: z.string().regex(/^[a-z\-]+$/),
    locale: z.enum(['en', 'de']),
    inventoryCount: z.number().int().min(0),
    currentLoadoutId: z.string().uuid().optional(),
  }),
});
```

---

## Response Contract

### Success Response (Streaming)

```typescript
interface AIMessageStreamChunk {
  type: 'text' | 'inline_card' | 'action' | 'done';
  data: string | InlineCard | Action | null;
}

// Streamed incrementally using Vercel AI SDK
type StreamResponse = ReadableStream<AIMessageStreamChunk>;
```

**Streaming Sequence**:
1. Initial text chunks streamed as `{ type: 'text', data: 'partial response...' }`
2. Inline cards streamed when encountered: `{ type: 'inline_card', data: { ... } }`
3. Actions streamed when executed: `{ type: 'action', data: { ... } }`
4. Final chunk: `{ type: 'done', data: null }`

**Example Stream**:
```
→ { type: 'text', data: 'The Zpacks Duplex is a great' }
→ { type: 'text', data: ' ultralight tent option. Here's how it compares:' }
→ { type: 'inline_card', data: { type: 'gear_alternative', gearItemId: '...', name: 'Zpacks Duplex', ... } }
→ { type: 'text', data: ' Would you like me to add it to your wishlist?' }
→ { type: 'done', data: null }
```

### Error Response

```typescript
interface AIMessageError {
  code: string; // Error code (see Error Codes section)
  message: string; // User-friendly error message (localized)
  retryable: boolean; // Whether client should retry
  rateLimitResetsAt?: Date; // If rate limited, when user can retry
}
```

**Error Response Format**:
```typescript
throw new Error(JSON.stringify({
  code: 'RATE_LIMIT_EXCEEDED',
  message: 'You have reached the message limit (30/hour). Please try again later.',
  retryable: false,
  rateLimitResetsAt: new Date('2024-12-16T15:30:00Z'),
}));
```

---

## Server Action Implementation Pattern

```typescript
'use server';

import { streamText } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { createClient } from '@/lib/supabase/server';
import { SendAIMessageInputSchema } from '@/types/ai-assistant';

export async function sendAIMessage(input: SendAIMessageInput) {
  // 1. Validate input
  const validatedInput = SendAIMessageInputSchema.parse(input);

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error(JSON.stringify({
      code: 'UNAUTHENTICATED',
      message: 'You must be logged in to use the AI assistant.',
      retryable: false,
    }));
  }

  // 3. Check Trailblazer subscription
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_tier !== 'trailblazer') {
    throw new Error(JSON.stringify({
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'AI Assistant is a Trailblazer feature. Upgrade to continue.',
      retryable: false,
    }));
  }

  // 4. Check rate limit
  const { data: rateLimitStatus } = await supabase.rpc('check_rate_limit', {
    p_user_id: user.id,
    p_endpoint: '/api/chat',
    p_limit: 30,
    p_window_hours: 1,
  });

  if (rateLimitStatus.exceeded) {
    throw new Error(JSON.stringify({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `You have reached the message limit (30/hour). Resets at ${rateLimitStatus.resets_at}.`,
      retryable: false,
      rateLimitResetsAt: new Date(rateLimitStatus.resets_at),
    }));
  }

  // 5. Increment rate limit counter
  await supabase.rpc('increment_rate_limit', {
    p_user_id: user.id,
    p_endpoint: '/api/chat',
  });

  // 6. Save user message to database
  const { data: userMessage } = await supabase
    .from('messages')
    .insert({
      conversation_id: validatedInput.conversationId,
      role: 'user',
      content: validatedInput.messageContent,
      context: validatedInput.context,
    })
    .select()
    .single();

  // 7. Build AI prompt with context
  const systemPrompt = buildSystemPrompt(validatedInput.context);
  const conversationHistory = await fetchConversationHistory(
    validatedInput.conversationId,
    10 // last 10 messages
  );

  // 8. Call AI with streaming
  try {
    const result = streamText({
      model: anthropic('claude-sonnet-4.5'),
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: validatedInput.messageContent },
      ],
      maxTokens: 1000,
      temperature: 0.7,
      tools: {
        addToWishlist: tool({ /* ... */ }),
        sendMessage: tool({ /* ... */ }),
        compare: tool({ /* ... */ }),
      },
      abortSignal: AbortSignal.timeout(30000), // 30s timeout
      experimental_telemetry: { isEnabled: true }, // OpenTelemetry
    });

    const stream = createStreamableValue(result.textStream);

    // 9. Save assistant message after streaming completes
    result.then(async (finalResult) => {
      await supabase.from('messages').insert({
        conversation_id: validatedInput.conversationId,
        role: 'assistant',
        content: finalResult.text,
        inline_cards: finalResult.toolCalls?.map(extractInlineCard) || null,
        actions: finalResult.toolCalls?.map(extractAction) || null,
        tokens_used: finalResult.usage.totalTokens,
      });

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date() })
        .eq('id', validatedInput.conversationId);
    });

    return stream.value;
  } catch (error) {
    // 10. Graceful degradation - check cached responses
    const cachedResponse = await getCachedResponse(
      validatedInput.messageContent,
      validatedInput.context.locale
    );

    if (cachedResponse) {
      // Return cached response as stream
      const stream = createStreamableValue();
      stream.update({ type: 'text', data: cachedResponse });
      stream.done();
      return stream.value;
    }

    // No cache hit - throw error
    throw new Error(JSON.stringify({
      code: 'AI_SERVICE_UNAVAILABLE',
      message: 'AI assistant is temporarily unavailable. Please try again later.',
      retryable: true,
    }));
  }
}
```

---

## Context Injection

**System Prompt Pattern**:

```typescript
function buildSystemPrompt(context: UserContext): string {
  const languageMap = {
    en: 'English',
    de: 'German',
  };

  return `You are a helpful gear assistant for GearShack.

User Context:
- Current screen: ${context.screen}
- Total gear items: ${context.inventoryCount}
- Language: ${languageMap[context.locale]}

Instructions:
- Respond ONLY in ${languageMap[context.locale]}. Do not switch languages mid-response.
- Brand names and product names remain in English.
- If the user asks about their inventory, reference their ${context.inventoryCount} items.
- If the user is on the loadout detail screen, offer loadout-specific advice.
- Use tools to execute actions when appropriate (add to wishlist, send message, compare).
- Keep responses concise (max 200 words).`;
}
```

---

## Rate Limiting

**Pattern**: Server-side rate limit check using Supabase function

**PostgreSQL Function**:
```sql
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id uuid,
  p_endpoint text
) RETURNS void AS $$
BEGIN
  UPDATE rate_limits
  SET count = count + 1,
      last_message_at = now()
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Client-Side Broadcast** (notify all tabs):
```typescript
const channel = supabase.channel(`rate-limit:${user.id}`);

// After incrementing rate limit
channel.send({
  type: 'broadcast',
  event: 'rate-limit-update',
  payload: {
    remaining: 30 - rateLimitStatus.count,
    resetsAt: rateLimitStatus.resets_at,
  },
});
```

---

## Graceful Degradation

**Pattern**: Fallback to cached responses when AI backend fails

**Cache Lookup Function**:
```typescript
async function getCachedResponse(
  query: string,
  locale: 'en' | 'de'
): Promise<string | null> {
  const supabase = await createClient();

  // Normalize query (lowercase, remove punctuation)
  const normalizedQuery = query.toLowerCase().replace(/[^\w\s]/g, '');

  // Fuzzy match using pg_trgm
  const { data } = await supabase
    .from('cached_responses')
    .select('response_en, response_de')
    .textSearch('query_pattern', normalizedQuery, {
      type: 'websearch',
      config: 'english',
    })
    .limit(1)
    .single();

  if (!data) return null;

  // Increment usage count
  await supabase
    .from('cached_responses')
    .update({ usage_count: data.usage_count + 1, last_used_at: new Date() })
    .eq('query_pattern', data.query_pattern);

  return locale === 'en' ? data.response_en : data.response_de;
}
```

---

## Multi-Session Synchronization

**Pattern**: Supabase Realtime Postgres Changes subscription

**Client-Side Subscription** (in `useConversationSync` hook):
```typescript
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // New message from another tab/device
    setMessages((prev) => [...prev, payload.new]);
  })
  .subscribe();
```

**Expected Sync Latency**: P95 < 200ms (Postgres Changes latency)

---

## Error Codes

| Code | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| `UNAUTHENTICATED` | 401 | No | User not logged in |
| `SUBSCRIPTION_REQUIRED` | 403 | No | Non-Trailblazer user |
| `RATE_LIMIT_EXCEEDED` | 429 | No | User exceeded 30 msg/hr |
| `INVALID_INPUT` | 400 | No | Input validation failed (Zod) |
| `CONVERSATION_NOT_FOUND` | 404 | No | Invalid conversation ID |
| `AI_SERVICE_UNAVAILABLE` | 503 | Yes | AI backend timeout or failure |
| `INTERNAL_ERROR` | 500 | Yes | Unexpected server error |

---

## Performance Requirements

**Success Criteria** (from spec.md):
- **SC-012**: 95% of responses delivered in under 3 seconds
- **SC-015**: 95% of cross-session sync within 2 seconds
- **SC-016**: 99.5% AI backend availability

**Monitoring** (OpenTelemetry metrics):
- `ai.response.latency` - Histogram (P50/P95/P99)
- `ai.requests.total` - Counter
- `ai.errors.total` - Counter
- `ai.cache_hits.total` - Counter (graceful degradation usage)

---

## Security Considerations

1. **RLS Enforcement**: All database queries filtered by `auth.uid()`
2. **Rate Limiting**: Server-side atomic checks prevent client-side bypass
3. **Input Sanitization**: Zod validation prevents injection attacks
4. **Timeout Protection**: 30s abort signal prevents indefinite hangs
5. **Subscription Check**: Verified server-side, not client claims

---

## Testing Strategy

**Unit Tests**:
- `sendAIMessage` with mocked Supabase client
- Rate limit edge cases (window reset, concurrent requests)
- Cached response fuzzy matching

**Integration Tests**:
- Full AI query flow with real Supabase (local instance)
- Multi-session sync with two browser tabs
- Graceful degradation when AI backend mocked to fail

**E2E Tests** (Playwright):
- User sends message → AI response appears
- Rate limit enforcement (send 31 messages)
- Sync across tabs (open two tabs, send message in one)

---

**Generated**: 2025-12-16 | **Status**: Ready for implementation
