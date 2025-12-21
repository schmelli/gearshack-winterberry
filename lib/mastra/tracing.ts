/**
 * Distributed Tracing Module for Mastra Workflows
 * Task T022: OpenTelemetry span instrumentation for workflows
 *
 * Provides tracing utilities for:
 * - Workflow execution spans (multi-step trip planning, etc.)
 * - Tool invocation spans (MCP tools, user data queries, etc.)
 * - External service calls (Weather API, TTS, Whisper, etc.)
 *
 * Integrates with instrumentation.node.ts which configures the NodeSDK.
 */

import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  type Span,
  type Tracer,
  type Context,
  type SpanOptions,
  propagation,
  type Attributes,
} from '@opentelemetry/api';

// =====================================================
// Tracer Setup
// =====================================================

const TRACER_NAME = 'mastra-workflows';
const TRACER_VERSION = '1.0.0';

/**
 * Get the tracer instance for Mastra workflows.
 * Uses the global tracer provider configured in instrumentation.node.ts.
 */
function getTracer(): Tracer {
  return trace.getTracer(TRACER_NAME, TRACER_VERSION);
}

// =====================================================
// Type Definitions
// =====================================================

/**
 * Span context with traceId for structured logging correlation
 */
export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

/**
 * Options for workflow span creation
 */
export interface WorkflowSpanOptions {
  /** User ID for attribution */
  userId?: string;
  /** Additional attributes to attach to the span */
  attributes?: Attributes;
}

/**
 * Options for tool span creation
 */
export interface ToolSpanOptions {
  /** Parent span context for nested tracing */
  parentContext?: Context;
  /** Additional attributes to attach to the span */
  attributes?: Attributes;
}

/**
 * Options for external call span creation
 */
export interface ExternalCallSpanOptions {
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request body size in bytes */
  requestSize?: number;
  /** Parent span context for nested tracing */
  parentContext?: Context;
  /** Additional attributes to attach to the span */
  attributes?: Attributes;
}

/**
 * Result of a traced operation with timing information
 */
export interface TracedResult<T> {
  result: T;
  durationMs: number;
  traceId: string;
}

// =====================================================
// Workflow Span Functions
// =====================================================

/**
 * Create a span for workflow step execution.
 *
 * Use this to trace individual steps within a multi-step workflow
 * like trip planning (intent analysis -> parallel data -> gap analysis -> synthesis).
 *
 * @param workflowId - Unique identifier for the workflow execution
 * @param stepName - Name of the workflow step (e.g., "intent_analysis", "gap_detection")
 * @param options - Optional configuration for the span
 * @returns The created span (must be ended by caller)
 *
 * @example
 * ```typescript
 * const span = createWorkflowSpan('trip-123', 'weather_fetch');
 * try {
 *   const weather = await fetchWeather(location);
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (error) {
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
 *   span.recordException(error);
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createWorkflowSpan(
  workflowId: string,
  stepName: string,
  options?: WorkflowSpanOptions
): Span {
  const tracer = getTracer();

  const spanOptions: SpanOptions = {
    kind: SpanKind.INTERNAL,
    attributes: {
      'workflow.id': workflowId,
      'workflow.step': stepName,
      ...(options?.userId && { 'user.id': options.userId }),
      ...options?.attributes,
    },
  };

  return tracer.startSpan(`workflow.${stepName}`, spanOptions);
}

/**
 * Execute a function within a workflow span context.
 *
 * Automatically handles span lifecycle (start, status, end) and error recording.
 * The span is available within the function via the active context.
 *
 * @param workflowId - Unique identifier for the workflow execution
 * @param stepName - Name of the workflow step
 * @param fn - Async function to execute within the span
 * @param options - Optional configuration for the span
 * @returns The result of the function with timing and trace information
 *
 * @example
 * ```typescript
 * const { result, durationMs, traceId } = await traceWorkflowStep(
 *   'trip-123',
 *   'intent_analysis',
 *   async () => {
 *     return analyzeIntent(userQuery);
 *   },
 *   { userId: 'user-456' }
 * );
 * ```
 */
export async function traceWorkflowStep<T>(
  workflowId: string,
  stepName: string,
  fn: () => Promise<T>,
  options?: WorkflowSpanOptions
): Promise<TracedResult<T>> {
  const span = createWorkflowSpan(workflowId, stepName, options);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });

    const durationMs = Date.now() - startTime;
    span.setAttribute('workflow.duration_ms', durationMs);

    return {
      result,
      durationMs,
      traceId: span.spanContext().traceId,
    };
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
// Tool Span Functions
// =====================================================

/**
 * Create a span for tool invocation.
 *
 * Use this to trace AI tool calls such as MCP queries, user data lookups,
 * catalog searches, and web searches.
 *
 * @param toolName - Name of the tool being invoked (e.g., "queryUserData", "searchCatalog")
 * @param args - Arguments passed to the tool (will be serialized for tracing)
 * @param options - Optional configuration for the span
 * @returns The created span (must be ended by caller)
 *
 * @example
 * ```typescript
 * const span = createToolSpan('queryUserData', { userId: 'user-123', query: 'gear' });
 * try {
 *   const data = await queryUserData(userId, query);
 *   span.setAttribute('tool.result_count', data.length);
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (error) {
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
 *   span.recordException(error);
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createToolSpan(
  toolName: string,
  args: Record<string, unknown>,
  options?: ToolSpanOptions
): Span {
  const tracer = getTracer();

  // Serialize args safely, truncating large values
  const safeArgs = sanitizeToolArgs(args);

  const spanOptions: SpanOptions = {
    kind: SpanKind.INTERNAL,
    attributes: {
      'tool.name': toolName,
      'tool.args': JSON.stringify(safeArgs),
      ...options?.attributes,
    },
  };

  const parentContext = options?.parentContext ?? context.active();
  return tracer.startSpan(`tool.${toolName}`, spanOptions, parentContext);
}

/**
 * Execute a function within a tool span context.
 *
 * Automatically handles span lifecycle and error recording for tool invocations.
 *
 * @param toolName - Name of the tool being invoked
 * @param args - Arguments passed to the tool
 * @param fn - Async function to execute within the span
 * @param options - Optional configuration for the span
 * @returns The result of the function with timing and trace information
 *
 * @example
 * ```typescript
 * const { result, durationMs } = await traceToolCall(
 *   'mcp.findAlternatives',
 *   { productId: 'msr-pocketrocket', constraints: { maxWeight: 100 } },
 *   async () => {
 *     return mcpClient.call('findAlternatives', args);
 *   }
 * );
 * ```
 */
export async function traceToolCall<T>(
  toolName: string,
  args: Record<string, unknown>,
  fn: () => Promise<T>,
  options?: ToolSpanOptions
): Promise<TracedResult<T>> {
  const span = createToolSpan(toolName, args, options);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });

    const durationMs = Date.now() - startTime;
    span.setAttribute('tool.duration_ms', durationMs);

    return {
      result,
      durationMs,
      traceId: span.spanContext().traceId,
    };
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
// External Call Span Functions
// =====================================================

/**
 * Create a span for external service calls.
 *
 * Use this to trace calls to external APIs like Weather API, TTS, Whisper,
 * MCP server, or any third-party service.
 *
 * @param service - Name of the external service (e.g., "weather-api", "openai-tts", "whisper")
 * @param endpoint - The endpoint being called (e.g., "/v1/forecast", "/v1/audio/speech")
 * @param options - Optional configuration for the span
 * @returns The created span (must be ended by caller)
 *
 * @example
 * ```typescript
 * const span = createExternalCallSpan('weather-api', '/v1/forecast', {
 *   method: 'GET',
 *   attributes: { 'weather.location': 'Stockholm' }
 * });
 * try {
 *   const response = await fetch(weatherApiUrl);
 *   span.setAttribute('http.status_code', response.status);
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (error) {
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
 *   span.recordException(error);
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createExternalCallSpan(
  service: string,
  endpoint: string,
  options?: ExternalCallSpanOptions
): Span {
  const tracer = getTracer();

  const spanOptions: SpanOptions = {
    kind: SpanKind.CLIENT,
    attributes: {
      'service.name': service,
      'http.url': endpoint,
      ...(options?.method && { 'http.method': options.method }),
      ...(options?.requestSize && { 'http.request_content_length': options.requestSize }),
      ...options?.attributes,
    },
  };

  const parentContext = options?.parentContext ?? context.active();
  return tracer.startSpan(`external.${service}`, spanOptions, parentContext);
}

/**
 * Execute a function within an external call span context.
 *
 * Automatically handles span lifecycle, error recording, and HTTP-specific attributes.
 *
 * @param service - Name of the external service
 * @param endpoint - The endpoint being called
 * @param fn - Async function to execute within the span
 * @param options - Optional configuration for the span
 * @returns The result of the function with timing and trace information
 *
 * @example
 * ```typescript
 * const { result, durationMs, traceId } = await traceExternalCall(
 *   'openai-whisper',
 *   '/v1/audio/transcriptions',
 *   async () => {
 *     return openai.audio.transcriptions.create({ file: audioFile, model: 'whisper-1' });
 *   },
 *   { method: 'POST', requestSize: audioFile.size }
 * );
 * console.log(`Transcription completed in ${durationMs}ms, traceId: ${traceId}`);
 * ```
 */
export async function traceExternalCall<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>,
  options?: ExternalCallSpanOptions
): Promise<TracedResult<T>> {
  const span = createExternalCallSpan(service, endpoint, options);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });

    const durationMs = Date.now() - startTime;
    span.setAttribute('http.duration_ms', durationMs);

    return {
      result,
      durationMs,
      traceId: span.spanContext().traceId,
    };
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
// Context Propagation Functions
// =====================================================

/**
 * Get the current trace context for structured logging correlation.
 *
 * Use this to include traceId in log messages for cross-referencing
 * between traces and logs.
 *
 * @returns Current span context or null if not in a traced context
 *
 * @example
 * ```typescript
 * const traceContext = getCurrentTraceContext();
 * logger.info('Processing request', {
 *   traceId: traceContext?.traceId ?? 'no-trace',
 *   userId: user.id,
 * });
 * ```
 */
export function getCurrentTraceContext(): SpanContext | null {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return null;
  }

  const spanContext = activeSpan.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
  };
}

/**
 * Get the current traceId for log correlation.
 *
 * Convenience function that returns just the traceId string,
 * or 'no-trace' if not in a traced context.
 *
 * @returns Current traceId or 'no-trace'
 *
 * @example
 * ```typescript
 * console.log(JSON.stringify({
 *   timestamp: new Date().toISOString(),
 *   traceId: getTraceId(),
 *   message: 'Workflow step completed',
 * }));
 * ```
 */
export function getTraceId(): string {
  const traceContext = getCurrentTraceContext();
  return traceContext?.traceId ?? 'no-trace';
}

/**
 * Inject trace context into HTTP headers for distributed tracing.
 *
 * Use this when making outbound HTTP calls to propagate trace context
 * to downstream services.
 *
 * @param headers - Headers object to inject trace context into
 * @returns The headers object with trace context injected
 *
 * @example
 * ```typescript
 * const headers: Record<string, string> = {
 *   'Content-Type': 'application/json',
 * };
 * injectTraceContext(headers);
 * const response = await fetch(url, { headers });
 * ```
 */
export function injectTraceContext(headers: Record<string, string>): Record<string, string> {
  propagation.inject(context.active(), headers);
  return headers;
}

/**
 * Extract trace context from incoming HTTP headers.
 *
 * Use this when receiving HTTP requests to continue the trace
 * from upstream services.
 *
 * @param headers - Headers object to extract trace context from
 * @returns Context with extracted trace information
 *
 * @example
 * ```typescript
 * const extractedContext = extractTraceContext(request.headers);
 * context.with(extractedContext, async () => {
 *   // Operations here will be part of the incoming trace
 *   await processRequest();
 * });
 * ```
 */
export function extractTraceContext(headers: Record<string, string>): Context {
  return propagation.extract(context.active(), headers);
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Sanitize tool arguments for safe logging.
 *
 * Truncates large string values and removes sensitive fields.
 * Ensures trace attributes don't exceed reasonable size limits.
 *
 * @param args - Tool arguments to sanitize
 * @returns Sanitized arguments safe for tracing
 */
function sanitizeToolArgs(args: Record<string, unknown>): Record<string, unknown> {
  const MAX_STRING_LENGTH = 200;
  const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Truncate long strings
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      sanitized[key] = `${value.substring(0, MAX_STRING_LENGTH)}...[truncated]`;
      continue;
    }

    // Handle nested objects (shallow only)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = '[object]';
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      sanitized[key] = `[array:${value.length}]`;
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Add attributes to the current active span.
 *
 * Convenience function for adding attributes without
 * needing to get the span reference.
 *
 * @param attributes - Attributes to add to the current span
 *
 * @example
 * ```typescript
 * await traceWorkflowStep('trip-123', 'gap_analysis', async () => {
 *   const gaps = analyzeGaps(inventory, requirements);
 *   addSpanAttributes({
 *     'gaps.count': gaps.length,
 *     'gaps.categories': gaps.map(g => g.category).join(','),
 *   });
 *   return gaps;
 * });
 * ```
 */
export function addSpanAttributes(attributes: Attributes): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        activeSpan.setAttribute(key, value);
      }
    }
  }
}

/**
 * Record an event on the current active span.
 *
 * Use this to mark significant moments within a traced operation.
 *
 * @param name - Name of the event
 * @param attributes - Optional attributes for the event
 *
 * @example
 * ```typescript
 * await traceWorkflowStep('trip-123', 'synthesis', async () => {
 *   recordSpanEvent('started_streaming');
 *   for await (const chunk of generatePlan()) {
 *     yield chunk;
 *   }
 *   recordSpanEvent('streaming_complete', { chunks_sent: chunkCount });
 * });
 * ```
 */
export function recordSpanEvent(name: string, attributes?: Attributes): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.addEvent(name, attributes);
  }
}
