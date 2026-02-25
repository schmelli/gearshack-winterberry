# Research: AI Assistant Implementation

**Date**: 2025-12-16
**Feature**: 050-ai-assistant
**Research Scope**: Vercel AI SDK, Supabase Realtime, OpenTelemetry

---

## Executive Summary

Research conducted to resolve technical unknowns for implementing GearShack AI Assistant. Key decisions:

1. **AI Integration**: Vercel AI SDK with Server Actions pattern (streaming responses, <3s target latency)
2. **Multi-Session Sync**: Hybrid Supabase Realtime approach (Broadcast for ephemeral events, Postgres Changes for messages)
3. **Observability**: OpenTelemetry with exponential histograms for P50/P95/P99 latency tracking

All three technologies integrate seamlessly with Next.js 16+ App Router and meet constitutional requirements.

---

## 1. Vercel AI SDK Integration

### Decision: Use Vercel AI SDK with Server Actions

**Rationale**:
- Official Vercel support for Next.js App Router (native integration)
- Streaming responses via `streamText()` meet <3s latency requirement (SC-012)
- Built-in error handling with `AbortSignal.timeout()`
- Compatible with existing project pattern (already used in loadout image generation)

### Setup Pattern

```typescript
// Server Action pattern
'use server';
import { streamText } from 'ai';

export async function generateChatResponse(messages: UIMessage[]) {
  const result = streamText({
    model: 'anthropic/claude-sonnet-4.5',
    messages: convertToModelMessages(messages),
    maxTokens: 1000,
    abortSignal: AbortSignal.timeout(30000), // 30s timeout
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}
```

### Context Management Strategy

**System Prompt Pattern**: Include user context (inventory, current screen, locale) in system prompt:

```typescript
const systemPrompt = `You are a helpful gear assistant.
User Context:
- Total gear items: ${inventory?.length || 0}
- Current screen: ${screenContext}
- Language: ${locale}

Respond in ${languageMap[locale]}.`;
```

**Conversation History**: Limit to last 10 messages to avoid token limits:

```typescript
messages: convertToModelMessages(messages.slice(-10))
```

### Error Handling & Graceful Degradation

**Pattern**: Retry transient errors once, cache common queries for fallback

```typescript
const COMMON_QUERIES = {
  'what is base weight': 'Base weight is the total weight...',
  'how do i reduce pack weight': 'Top strategies: 1) Replace heaviest items...',
};

// Check cache first (instant response during AI outage)
const cachedAnswer = getCachedAnswer(lastMessage.content);
if (cachedAnswer) {
  return new Response(cachedAnswer);
}

// Fall through to AI with retry
try {
  return await generateChatResponse(messages);
} catch (error) {
  if (isTransientError(error) && attempt < 1) {
    return generateChatResponse(messages, attempt + 1);
  }
  throw new AIChatError(/* user-friendly message */);
}
```

### Multilingual Support

**Decision**: Pass `locale` in system prompt, AI handles translation

```typescript
system: `Respond ONLY in ${languageMap[locale]}. Do not switch languages mid-response.`
```

Brand names and product names remain untranslated (constitution requirement).

### Structured Outputs (Inline Cards & Actions)

**Pattern**: Use `tools` for action execution (Add to Wishlist, Compare)

```typescript
tools: {
  createLoadout: tool({
    inputSchema: z.object({
      name: z.string(),
      activity: z.enum(['hiking', 'backpacking', 'camping']),
    }),
    execute: async ({ name, activity }) => {
      // Create loadout in Supabase
      const { data } = await supabase.from('loadouts').insert({ name, activity });
      return { success: true, loadoutId: data.id };
    },
  }),
}
```

Client renders tool results with action buttons.

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| OpenAI SDK directly | Vercel AI SDK provides better Next.js integration, streaming support |
| LangChain | Over-engineered for chat use case, larger bundle size |
| Direct Anthropic SDK | Missing Next.js streaming utilities, more boilerplate code |

---

## 2. Supabase Realtime Multi-Session Synchronization

### Decision: Hybrid Approach (Broadcast + Postgres Changes)

**Rationale**:
- **Broadcast** for ephemeral events (typing, context updates): 6ms P50, 28ms P95 latency
- **Postgres Changes** for persistent messages: 46ms P50, 132ms P95 latency
- Both well under <2s sync requirement (SC-015)

### Architecture Pattern

```typescript
const channel = supabase
  .channel(`chat:${userId}`)

  // 1. Persistent messages via Postgres Changes
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })

  // 2. Ephemeral context updates via Broadcast
  .on('broadcast', { event: 'context-change' }, ({ payload }) => {
    if (payload.tabId !== tabId) {
      setContext(payload);
    }
  })

  .subscribe();
```

### Performance Optimization

1. **RLS Policy Optimization**: Simple indexed policies (avoid complex joins)

```sql
create policy "users_can_view_messages"
  on messages for select
  using (auth.uid() = user_id);

create index messages_user_id_idx on messages(user_id);
```

2. **Throttle High-Frequency Events**: 300ms for typing indicators

```typescript
const sendTypingIndicator = throttle((isTyping) => {
  channel.send({ type: 'broadcast', event: 'typing', payload });
}, 300);
```

### Conflict Resolution

**Strategy**: Server-side timestamp ordering (automatic via Postgres)

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  constraint messages_created_at_idx unique (created_at, id)
);
```

Postgres processes changes sequentially, maintaining insertion order.

### Connection Management

**Pattern**: Exponential backoff reconnection with max 5 attempts

```typescript
const reconnectWithBackoff = () => {
  const delay = 1000 * Math.pow(2, reconnectAttempts); // 1s, 2s, 4s, 8s, 16s
  setTimeout(() => subscribeToChannel(), delay);
};

// Handle online/offline
window.addEventListener('online', () => {
  reconnectAttempts = 0;
  subscribeToChannel();
});
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| WebSockets (custom) | Supabase Realtime provides managed infrastructure, RLS integration |
| Pusher/Ably | Additional cost, Supabase already available in stack |
| Server-Sent Events | No bidirectional communication, harder to implement Broadcast pattern |

---

## 3. OpenTelemetry Observability

### Decision: OpenTelemetry SDK with Exponential Histograms

**Rationale**:
- Industry standard for distributed tracing (FR-045)
- Exponential histograms automatically calculate P50/P95/P99 (FR-041)
- Vendor-agnostic (can export to Prometheus, Datadog, New Relic, SigNoz)
- Next.js has official guide for OpenTelemetry

### Setup Pattern

**Node.js Runtime** (`instrumentation.node.ts`):

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'gearshack-winterberry',
    [ATTR_SERVICE_VERSION]: process.env.VERCEL_GIT_COMMIT_SHA,
  }),
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 30000, // Export every 30s
  }),
  views: [
    new View({
      instrumentName: 'ai.response.latency',
      aggregation: new ExponentialHistogramAggregation(),
    }),
  ],
});
```

### Distributed Tracing Pattern

**Server Action Wrapper**:

```typescript
export function traceServerAction<T>(
  actionName: string,
  action: T
): T {
  return tracer.startActiveSpan(`server-action.${actionName}`, async (span) => {
    try {
      const result = await action(...args);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**AI SDK Instrumentation**:

```typescript
const result = await traceAIGeneration(
  'generateText',
  'claude-sonnet-4.5',
  async (span) => {
    span.setAttribute('ai.input.message_length', message.length);
    const result = await generateText({
      experimental_telemetry: { isEnabled: true },
    });
    span.setAttribute('ai.output.tokens', result.usage.totalTokens);
    return result;
  }
);
```

### Metrics Collection

**Counters**:
- `ai.requests.total` - Total AI requests
- `ai.errors.total` - AI failures
- `ai.rate_limit.hits` - Rate limit hits
- `sync.events.total` - Sync events
- `engagement.modal.opens` - User engagement funnel

**Histograms** (Exponential):
- `ai.response.latency` - P50/P95/P99 AI latency
- `db.query.duration` - P50/P95/P99 database latency
- `sync.event.duration` - P50/P95/P99 sync latency

### Structured Logging with Trace ID Propagation

```typescript
const traceContext = getTraceContext();

const logRecord = {
  timestamp: new Date().toISOString(),
  severity: 'ERROR',
  message: 'AI request failed',
  trace_id: traceContext?.traceId, // Correlation
  span_id: traceContext?.spanId,
  user_id: userId,
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack,
  },
};

logger.emit({ body: JSON.stringify(logRecord) });
```

### Alerting Rules

**Critical (P0)**:
1. AI failure rate >10% for 5 minutes → PagerDuty
2. Sync failure rate >5% for 5 minutes → PagerDuty

**Warning (P1)**:
3. AI P99 latency >5s for 10 minutes → Slack #alerts
4. Rate limit hits >10/hour → Slack #alerts

**Prometheus Queries**:

```promql
# AI Failure Rate
(sum(rate(ai_errors_total[5m])) / sum(rate(ai_requests_total[5m]))) * 100 > 10

# AI P99 Latency
histogram_quantile(0.99, rate(ai_response_latency_bucket[10m])) > 5000
```

### Backend Integration Recommendation

**Decision**: SigNoz (open-source) or Prometheus + Grafana

**Rationale**:
- **SigNoz**: All-in-one (traces, metrics, logs), cost-effective, OTLP native
- **Prometheus + Grafana**: Maximum flexibility, self-hosted option, free

Avoid Datadog/New Relic initially due to cost at scale.

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Sentry only | Missing metrics/histogram support for P50/P95/P99 |
| Custom logging | Reinventing wheel, no vendor-agnostic standard |
| CloudWatch (AWS) | Vendor lock-in, not optimized for OTLP |

---

## 4. Additional Findings

### Rate Limiting Implementation

**Pattern**: Store rate limit state in Supabase, broadcast to all tabs

```sql
create table rate_limits (
  user_id uuid references auth.users,
  endpoint text,
  count integer,
  window_start timestamptz,
  primary key (user_id, endpoint)
);
```

```typescript
// Check rate limit
const { data } = await supabase.rpc('check_rate_limit', {
  p_user_id: userId,
  p_endpoint: '/api/chat',
  p_limit: 30,
  p_window_hours: 1,
});

if (data.exceeded) {
  // Broadcast to all tabs
  channel.send({
    type: 'broadcast',
    event: 'rate-limit',
    payload: { endsAt: data.resets_at },
  });
  throw new Error('Rate limit exceeded');
}
```

### 90-Day Conversation Retention

**Pattern**: Postgres job to purge old conversations

```sql
-- Scheduled job (pg_cron)
select cron.schedule(
  'purge-old-conversations',
  '0 2 * * *', -- Daily at 2am
  $$
  delete from conversations
  where updated_at < now() - interval '90 days';
  $$
);
```

### Next.js Compatibility

All three technologies have official Next.js 16+ App Router support:
- Vercel AI SDK: Official Vercel product
- Supabase Realtime: Official Next.js guide in docs
- OpenTelemetry: Official Next.js instrumentation guide

---

## 5. Implementation Recommendations

### Phase 1 (MVP - User Stories P1)

1. **Vercel AI SDK**: Basic chat with streaming responses
2. **Supabase Realtime**: Message sync via Postgres Changes only (defer Broadcast for Phase 2)
3. **OpenTelemetry**: Basic tracing + AI latency metrics

**Estimated Effort**: 2-3 weeks (single developer)

### Phase 2 (Full Features - User Stories P2/P3)

1. **Vercel AI SDK**: Structured outputs (inline cards), tools (actions)
2. **Supabase Realtime**: Add Broadcast for context updates, typing indicators
3. **OpenTelemetry**: Full metrics suite, alerting integration

**Estimated Effort**: 1-2 weeks additional

### Risk Mitigation

**Risk**: AI backend latency exceeds 3s target
**Mitigation**:
- Implement aggressive timeout (30s max)
- Cache common queries
- Use faster model for simple queries (gemini-2.5-flash instead of claude-sonnet-4.5)

**Risk**: Supabase Realtime RLS performance degrades with scale
**Mitigation**:
- Optimize RLS policies (simple `auth.uid() = user_id` only)
- Add indexes on `user_id` columns
- Monitor P95 latency, migrate to server-side streaming if >2s

**Risk**: OpenTelemetry overhead impacts performance
**Mitigation**:
- Enable production sampling (10% of requests)
- Use batch processors (not simple processors)
- Monitor memory usage (<20MB expected overhead)

---

## 6. Dependencies & Environment Setup

### New Dependencies

```json
{
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/react": "^1.0.0",
    "@opentelemetry/sdk-node": "^1.29.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/instrumentation": "^0.57.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.57.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.57.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.57.0",
    "@opentelemetry/auto-instrumentations-node": "^0.52.0",
    "@opentelemetry/instrumentation-pg": "^0.49.0"
  }
}
```

### Environment Variables

```bash
# Vercel AI SDK
AI_GATEWAY_API_KEY=your_gateway_api_key
AI_CHAT_MODEL=anthropic/claude-sonnet-4.5
AI_CHAT_ENABLED=true

# OpenTelemetry
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
OTEL_API_KEY=your-api-key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 7. Success Criteria Validation

| Requirement | Solution | Validation |
|-------------|----------|------------|
| SC-012: 95% responses <3s | Vercel AI SDK streaming | Measure with `ai.response.latency` histogram |
| SC-015: 95% sync <2s | Supabase Realtime (Broadcast 28ms P95) | Measure with `sync.event.duration` histogram |
| SC-016: 99.5% availability | Graceful degradation + cached responses | Monitor with `ai.failure.rate` metric |
| FR-041-048: Observability | OpenTelemetry comprehensive setup | Validate via Prometheus queries |

All requirements achievable with selected technologies.

---

## Research Artifacts

- **Vercel AI SDK Documentation**: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
- **Supabase Realtime Guide**: https://supabase.com/docs/guides/realtime/realtime-with-nextjs
- **OpenTelemetry Next.js Guide**: https://nextjs.org/docs/app/guides/open-telemetry
- **Performance Benchmarks**: Supabase Realtime - https://supabase.com/docs/guides/realtime/benchmarks

**Research Completed**: 2025-12-16
**Status**: ✅ All unknowns resolved, ready for Phase 1 design
