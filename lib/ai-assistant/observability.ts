/**
 * OpenTelemetry Observability Utilities
 * Feature 050: AI Assistant
 *
 * Provides distributed tracing, metrics, and structured logging
 * for monitoring AI assistant performance and reliability.
 */

import { trace, metrics, context, SpanStatusCode } from '@opentelemetry/api';

// =====================================================
// Tracer and Meter Setup
// =====================================================

const tracer = trace.getTracer('ai-assistant', '1.0.0');
const meter = metrics.getMeter('ai-assistant', '1.0.0');

// =====================================================
// Metrics
// =====================================================

/**
 * Counter: Total AI queries processed
 */
const aiQueryCounter = meter.createCounter('ai.query.count', {
  description: 'Total number of AI queries processed',
  unit: 'queries',
});

/**
 * Histogram: AI response latency (P50, P95, P99)
 */
const aiLatencyHistogram = meter.createHistogram('ai.query.latency', {
  description: 'AI query response time in milliseconds',
  unit: 'ms',
});

/**
 * Counter: Cache hits vs misses
 */
const cacheHitCounter = meter.createCounter('ai.cache.hit', {
  description: 'Number of cached response hits',
  unit: 'hits',
});

const cacheMissCounter = meter.createCounter('ai.cache.miss', {
  description: 'Number of cached response misses',
  unit: 'misses',
});

/**
 * Counter: Rate limit exceeded events
 */
const rateLimitCounter = meter.createCounter('ai.rate_limit.exceeded', {
  description: 'Number of rate limit violations',
  unit: 'events',
});

/**
 * Histogram: Token usage per query
 */
const tokenUsageHistogram = meter.createHistogram('ai.tokens.used', {
  description: 'Number of tokens consumed per AI query',
  unit: 'tokens',
});

/**
 * T067: Counter: AI tool calls (actions)
 */
const toolCallCounter = meter.createCounter('ai.tool.calls.total', {
  description: 'Total number of AI tool/action calls',
  unit: 'calls',
});

/**
 * T067: Histogram: Tool execution duration
 */
const toolDurationHistogram = meter.createHistogram('ai.tool.duration', {
  description: 'Tool execution time in milliseconds',
  unit: 'ms',
});

// =====================================================
// Tracing Functions
// =====================================================

/**
 * Trace an AI query execution
 *
 * Creates a span for the entire query lifecycle with timing and metadata.
 *
 * @param userId - User making the query
 * @param conversationId - Conversation UUID
 * @param queryFn - Async function to execute the query
 * @returns Query result
 */
export async function traceAIQuery<T>(
  userId: string,
  conversationId: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan('ai.query.execute', {
    attributes: {
      'user.id': userId,
      'conversation.id': conversationId,
    },
  });

  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), queryFn);

    const latency = Date.now() - startTime;

    // Record metrics
    aiQueryCounter.add(1, { status: 'success' });
    aiLatencyHistogram.record(latency);

    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute('query.latency_ms', latency);

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;

    aiQueryCounter.add(1, { status: 'error' });
    aiLatencyHistogram.record(latency);

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    span.recordException(error instanceof Error ? error : new Error(String(error)));

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace a cache lookup operation
 *
 * @param queryPattern - Normalized query being looked up
 * @param lookupFn - Async function to perform the lookup
 * @returns Cached response if found
 */
export async function traceCacheLookup<T>(
  queryPattern: string,
  lookupFn: () => Promise<T | null>
): Promise<T | null> {
  const span = tracer.startSpan('ai.cache.lookup', {
    attributes: {
      'cache.query_pattern': queryPattern,
    },
  });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), lookupFn);

    if (result) {
      cacheHitCounter.add(1);
      span.setAttribute('cache.hit', true);
    } else {
      cacheMissCounter.add(1);
      span.setAttribute('cache.hit', false);
    }

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}

// =====================================================
// Metrics Helpers
// =====================================================

/**
 * Record token usage for an AI response
 *
 * @param tokensUsed - Number of tokens consumed
 */
export function recordTokenUsage(tokensUsed: number): void {
  tokenUsageHistogram.record(tokensUsed);
}

/**
 * Record a rate limit exceeded event
 *
 * @param userId - User who exceeded the limit
 * @param endpoint - API endpoint that was rate limited
 */
export function recordRateLimitExceeded(userId: string, endpoint: string): void {
  rateLimitCounter.add(1, {
    'user.id': userId,
    endpoint,
  });
}

/**
 * Record a cache hit
 *
 * @param queryPattern - The cached query pattern that was matched
 */
export function recordCacheHit(queryPattern: string): void {
  cacheHitCounter.add(1, { query_pattern: queryPattern });
}

/**
 * Record a cache miss
 *
 * @param queryPattern - The query that had no cache match
 */
export function recordCacheMiss(queryPattern: string): void {
  cacheMissCounter.add(1, { query_pattern: queryPattern });
}

/**
 * T067: Record an AI tool/action call
 *
 * @param toolName - Name of the tool (e.g., 'add_to_wishlist', 'compare')
 * @param status - Execution status
 * @param durationMs - Execution time in milliseconds
 */
export function recordToolCall(
  toolName: string,
  status: 'success' | 'error',
  durationMs: number
): void {
  toolCallCounter.add(1, {
    tool_name: toolName,
    status,
  });

  toolDurationHistogram.record(durationMs, {
    tool_name: toolName,
  });
}

// =====================================================
// Structured Logging
// =====================================================

/**
 * Log an AI assistant event with structured data
 *
 * Outputs JSON-formatted logs for easy parsing by log aggregators.
 *
 * @param level - Log level (info, warn, error)
 * @param message - Human-readable message
 * @param metadata - Additional structured data
 */
export function logAIEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'ai-assistant',
    message,
    ...metadata,
  };

  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Log an AI query event
 *
 * @param userId - User making the query
 * @param conversationId - Conversation UUID
 * @param queryPreview - First 100 chars of query
 * @param status - Query result status
 */
export function logAIQuery(
  userId: string,
  conversationId: string,
  queryPreview: string,
  status: 'success' | 'error' | 'rate_limited' | 'cached' | 'streaming'
): void {
  logAIEvent('info', 'AI query processed', {
    userId,
    conversationId,
    queryPreview: queryPreview.substring(0, 100),
    status,
  });
}
