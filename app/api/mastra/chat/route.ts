/**
 * Mastra Chat API Route
 * Feature: 001-mastra-agentic-voice
 * Tasks: T023, T026-T032 [US1] - Persistent Memory Chat
 *
 * Provides streaming SSE responses for the Mastra agentic chat system
 * with persistent conversation memory, rate limiting, and observability.
 *
 * SSE Event Types:
 * - text: Text content chunk
 * - tool_call: Tool invocation metadata
 * - tool_result: Tool execution result
 * - workflow_progress: Multi-step workflow status updates
 * - done: Stream complete with final metadata
 * - error: Error occurred during streaming
 *
 * Memory Features (T026-T029):
 * - Conversation history retrieval (last 50 messages)
 * - Memory correction detection ("Actually, that's wrong...")
 * - Graceful degradation when memory unavailable
 * - Automatic message persistence
 *
 * Observability (T030-T032):
 * - Structured logging at each step
 * - Prometheus metrics (latency, counters, errors)
 * - Distributed tracing spans
 */

import { createClient } from '@/lib/supabase/server';
import {
  createStreamingResponse,
  createStreamingErrorResponse,
  encodeTextEvent,
  encodeDoneEvent,
  encodeErrorEvent,
  encodeWorkflowProgressEvent,
  encodeConfirmActionEvent,
} from '@/lib/mastra/streaming';
import type { ConfirmActionData } from '@/types/mastra';
import {
  logInfo,
  logError,
  logDebug,
  logWarn,
  setLogContext,
  clearLogContext,
  createTimer,
} from '@/lib/mastra/logging';
import {
  recordChatRequest,
  recordAgentLatency,
  recordChatError,
  recordToolCall,
  classifyQuery,
} from '@/lib/mastra/metrics';
import { traceWorkflowStep, getTraceId } from '@/lib/mastra/tracing';
import { checkAndIncrementRateLimit, type OperationType } from '@/lib/mastra/rate-limiter';
import { buildMastraSystemPrompt, type PromptContext } from '@/lib/mastra/config';
import { createGearAgent, streamMastraResponse } from '@/lib/mastra/mastra-agent';
import {
  getCachedLoadoutContext,
  preloadLoadoutContext,
  formatLoadoutContextForPrompt,
  type LoadoutContext,
} from '@/lib/mastra/context-preloader';
import {
  generateProactiveSuggestions,
  formatSuggestionsForStream,
  shouldShowProactiveSuggestions,
} from '@/lib/mastra/proactive-suggestions';
import type { MastraChatRequest } from '@/types/mastra';
import type { UserContext } from '@/types/ai-assistant';
import {
  parseQuery,
  isComplexOptimizationQuery,
  formatParsedQueryForPrompt,
  type ParsedQuery,
} from '@/lib/ai-assistant/query-parser';
import { classifyIntent, generateFastAnswer } from '@/lib/mastra/intent-router';
import { prefetchData, type PrefetchedContext } from '@/lib/mastra/parallel-prefetch';
import { ADD_TO_LOADOUT_TOOL_NAME } from '@/lib/mastra/tools/add-to-loadout';

// Force Node.js runtime for Mastra compatibility
export const runtime = 'nodejs';

// =====================================================
// Type Guards
// =====================================================

/** Shape of an addToLoadout tool result that requires user confirmation */
interface ConfirmableToolResult {
  requiresConfirmation: true;
  runId: string;
  message: string;
  gearItemId: string;
  gearItemName: string;
  loadoutId: string;
  loadoutName: string;
}

/**
 * Type guard for addToLoadout tool results that require user confirmation.
 * Validates all required string fields before constructing ConfirmActionData,
 * preventing runtime errors from unexpected AI output structures.
 */
function isConfirmableResult(result: unknown): result is ConfirmableToolResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return (
    r.requiresConfirmation === true &&
    typeof r.runId === 'string' && r.runId.length > 0 &&
    typeof r.message === 'string' &&
    typeof r.gearItemId === 'string' &&
    typeof r.gearItemName === 'string' &&
    typeof r.loadoutId === 'string' &&
    typeof r.loadoutName === 'string'
  );
}

// =====================================================
// Request Validation
// =====================================================

function validateRequest(body: unknown): {
  valid: true;
  data: MastraChatRequest;
} | {
  valid: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const request = body as Record<string, unknown>;

  // conversationId can be null/undefined for new conversations (will be generated)
  // or a non-empty string for existing conversations
  if (request.conversationId !== null && request.conversationId !== undefined) {
    if (typeof request.conversationId !== 'string' || request.conversationId.trim() === '') {
      return { valid: false, error: 'conversationId must be a non-empty string if provided' };
    }
  }

  if (typeof request.message !== 'string' || request.message.trim() === '') {
    return { valid: false, error: 'message is required and must be a non-empty string' };
  }

  const trimmedMessage = request.message.trim();
  if (trimmedMessage.length < 1) {
    return { valid: false, error: 'message must contain at least 1 character' };
  }
  if (trimmedMessage.length > 10000) {
    return { valid: false, error: 'message must not exceed 10000 characters' };
  }

  // SECURITY: Sanitize input to prevent control character injection and null bytes
  // Remove null bytes, control characters (except newlines/tabs), and other dangerous chars
  const sanitizedMessage = trimmedMessage
    .replace(/\0/g, '') // Null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Control chars (keep \n \r \t)

  if (sanitizedMessage !== trimmedMessage) {
    return { valid: false, error: 'message contains invalid control characters' };
  }

  if (request.context !== undefined && (typeof request.context !== 'object' || request.context === null)) {
    return { valid: false, error: 'context must be an object if provided' };
  }

  if (request.enableTools !== undefined && typeof request.enableTools !== 'boolean') {
    return { valid: false, error: 'enableTools must be a boolean if provided' };
  }

  if (request.enableVoice !== undefined && typeof request.enableVoice !== 'boolean') {
    return { valid: false, error: 'enableVoice must be a boolean if provided' };
  }

  return {
    valid: true,
    data: {
      conversationId: (request.conversationId as string | null | undefined) ?? null,
      message: trimmedMessage,
      context: request.context as Record<string, unknown> | undefined,
      enableTools: request.enableTools as boolean | undefined,
      enableVoice: request.enableVoice as boolean | undefined,
    },
  };
}

// =====================================================
// System Prompt Builder
// =====================================================

async function buildPromptContext(
  userContext: Record<string, unknown> | undefined,
  userId: string,
  subscriptionTier?: 'standard' | 'trailblazer',
  parsedQuery?: ParsedQuery,
): Promise<{ promptContext: PromptContext; loadoutContext: LoadoutContext | null }> {
  const locale = (userContext?.locale as string) || 'en';
  const screen = (userContext?.screen as string) || 'inventory';
  const inventoryCount = (userContext?.inventoryCount as number) || 0;
  const currentLoadoutId = userContext?.currentLoadoutId as string | undefined;

  // Build UserContext for prompt builder
  const promptUserContext: UserContext = {
    screen,
    locale,
    inventoryCount,
    currentLoadoutId,
    userId,
    subscriptionTier: subscriptionTier || 'standard',
  };

  const promptContext: PromptContext = {
    userContext: promptUserContext,
  };

  // Add parsed query constraints to prompt (for better tool selection)
  if (parsedQuery && parsedQuery.confidence > 0.5) {
    const constraintInfo = formatParsedQueryForPrompt(parsedQuery);
    if (constraintInfo) {
      promptContext.catalogResults = promptContext.catalogResults
        ? `${promptContext.catalogResults}\n\n${constraintInfo}`
        : constraintInfo;

      logDebug('Query constraints added to prompt', {
        userId,
        metadata: {
          intent: parsedQuery.intent,
          confidence: parsedQuery.confidence,
          hasConstraints: Object.keys(parsedQuery.constraints).length > 0,
        },
      });
    }
  }

  // Pre-load loadout context if viewing a loadout (Improvement #3: Context Pre-loading)
  let loadoutContext: LoadoutContext | null = null;
  if (screen === 'loadout-detail' && currentLoadoutId) {
    // Try to get from cache first (instant - no DB query)
    loadoutContext = getCachedLoadoutContext(currentLoadoutId, userId);

    // If not cached, pre-load it now
    if (!loadoutContext) {
      loadoutContext = await preloadLoadoutContext(currentLoadoutId, userId);
    }

    // Add loadout context to system prompt
    if (loadoutContext) {
      const formattedContext = formatLoadoutContextForPrompt(loadoutContext, locale as 'en' | 'de');
      promptContext.catalogResults = promptContext.catalogResults
        ? `${promptContext.catalogResults}\n\n${formattedContext}`
        : formattedContext;

      logDebug('Loadout context added to system prompt', {
        userId,
        metadata: {
          loadoutId: currentLoadoutId,
          itemCount: loadoutContext.gearItems.length,
          totalWeight: loadoutContext.loadout.totalWeight,
          cached: !!getCachedLoadoutContext(currentLoadoutId, userId),
        },
      });
    }
  }

  return { promptContext, loadoutContext };
}

// =====================================================
// POST Handler
// =====================================================

export async function POST(request: Request): Promise<Response> {
  const requestTimer = createTimer();
  const traceId = getTraceId();

  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logError('Failed to parse request body');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate request structure
    const validation = validateRequest(body);
    if (!validation.valid) {
      logError('Request validation failed', new Error(validation.error));
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, context, enableTools = true, enableVoice } = validation.data;
    // Generate conversation ID if not provided (ensures memory persistence works)
    const conversationId = validation.data.conversationId || crypto.randomUUID();

    // 3. Authenticate user via Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logError('Authentication failed', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in to use the chat.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3.5. Check subscription tier — AI Assistant requires Trailblazer tier.
    // Skip in development/test environments when AI_RATE_LIMITING_DISABLED=true
    // (matches the bypass used for rate limiting in the original stream route).
    const subscriptionCheckDisabled =
      process.env.AI_RATE_LIMITING_DISABLED === 'true' &&
      process.env.NODE_ENV !== 'production';

    let userSubscriptionTier: 'standard' | 'trailblazer' = 'standard';

    if (!subscriptionCheckDisabled) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        logError('Failed to verify subscription tier', profileError);
        return new Response(
          JSON.stringify({ error: 'Unable to verify account status.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      userSubscriptionTier =
        (profile.subscription_tier as 'standard' | 'trailblazer') || 'standard';

      if (userSubscriptionTier !== 'trailblazer') {
        logWarn('Subscription tier check failed - Trailblazer required', {
          userId: user.id,
        });
        return new Response(
          JSON.stringify({
            error: 'AI assistant is only available for Trailblazer subscribers.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Set logging context (T030)
    setLogContext({
      userId: user.id,
      conversationId,
      traceId,
      metadata: { enableTools, enableVoice },
    });

    logInfo('Mastra chat request started', {
      metadata: {
        messageLength: message.length,
        hasContext: !!context,
        enableTools,
        enableVoice,
      },
    });

    // 5. Classify query and record metrics (T031)
    const queryType = classifyQuery(message);
    const operationType = enableVoice ? 'voice' : (queryType === 'complex' ? 'workflow' : 'simple_query');
    recordChatRequest(operationType);

    // 5b. Parse query for constraints (budget, weight, intent) - AI Reliability Improvement
    const parsedQuery = parseQuery(message);
    const isOptimizationQuery = isComplexOptimizationQuery(parsedQuery);

    if (parsedQuery.confidence > 0.5) {
      logDebug('Query parsed for constraints', {
        userId: user.id,
        metadata: {
          intent: parsedQuery.intent,
          target: parsedQuery.target,
          sortPreference: parsedQuery.sortPreference,
          hasMaxBudget: !!parsedQuery.constraints.maxBudget,
          hasMaxWeight: !!parsedQuery.constraints.maxWeight,
          isOptimization: isOptimizationQuery,
          confidence: parsedQuery.confidence,
        },
      });
    }

    // 6. Check rate limits (must remain outside stream for proper HTTP status codes)
    const currentLoadoutId = context?.currentLoadoutId as string | undefined;
    const rateLimitResult = await checkAndIncrementRateLimit(user.id, operationType as OperationType);

    // Check rate limit result first (early return if exceeded)
    if (!rateLimitResult.allowed) {
      logWarn('Rate limit exceeded', {
        userId: user.id,
        metadata: {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
      });
      recordChatError('rate_limit');

      // T106: Rate limit exceeded response with proper headers
      const resetTimestamp = rateLimitResult.resetAt
        ? Math.ceil(rateLimitResult.resetAt.getTime() / 1000)
        : Math.ceil(Date.now() / 1000) + 3600;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetTimestamp * 1000 - Date.now()) / 1000)
      );

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You have exceeded your rate limit. Please wait ${retryAfterSeconds} seconds before trying again.`,
          limit: rateLimitResult.limit,
          remaining: 0,
          resetAt: rateLimitResult.resetAt?.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(rateLimitResult.limit ?? 'unlimited'),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTimestamp),
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    // Store rate limit info for response headers (T105)
    const rateLimitHeaders: Record<string, string> = {};
    if (rateLimitResult.limit !== null) {
      rateLimitHeaders['X-RateLimit-Limit'] = String(rateLimitResult.limit);
      rateLimitHeaders['X-RateLimit-Remaining'] = String(rateLimitResult.remaining ?? 0);
      if (rateLimitResult.resetAt) {
        rateLimitHeaders['X-RateLimit-Reset'] = String(
          Math.ceil(rateLimitResult.resetAt.getTime() / 1000)
        );
      }
    }

    // 7. Check AI availability before starting stream (proper HTTP 503)
    if (!process.env.AI_GATEWAY_KEY && !process.env.AI_GATEWAY_API_KEY) {
      logWarn('AI service unavailable - AI_GATEWAY_KEY not configured', { userId: user.id });
      recordChatError('ai_unavailable');

      return createStreamingErrorResponse(
        'AI service is temporarily unavailable. Please try again later.',
        'AI_UNAVAILABLE',
        503
      );
    }

    // 8. Start the stream IMMEDIATELY, then do slow pipeline work inside start()
    // This allows us to emit workflow_progress SSE events during memory fetch,
    // intent classification, and prefetch so the user sees real-time progress.
    const encoder = new TextEncoder();
    const messageId = crypto.randomUUID();
    let fullResponse = '';

    // Determine locale for progress messages (hardcoded server-side, no i18n needed)
    const locale = (context?.locale as string) === 'de' ? 'de' : 'en';

    const progressMessages = {
      en: {
        memory: 'Loading your profile...',
        context: 'Analysing your gear...',
        thinking: 'Preparing answer...',
      },
      de: {
        memory: 'Profil wird geladen...',
        context: 'Ausrüstung wird analysiert...',
        thinking: 'Antwort wird vorbereitet...',
      },
    } as const;

    const stream = new ReadableStream({
      async start(controller) {
        let hadError = false;

        // Helper to emit progress events
        const emitProgress = (step: string, msg: string) => {
          controller.enqueue(encoder.encode(encodeWorkflowProgressEvent(step, 'running', msg)));
        };

        try {
          // --- Phase 1: Intent classification ---
          emitProgress('memory', progressMessages[locale].memory);

          const intentResult = await classifyIntent(
            message,
            context?.screen as string | undefined,
            currentLoadoutId
          );

          // --- Phase 2: Context / Prefetch (emit progress) ---
          emitProgress('context', progressMessages[locale].context);

          // Pre-fetch data based on intent classification
          let prefetchedContext: PrefetchedContext | null = null;
          if (intentResult.dataRequirements.length > 0) {
            const prefetchLocale = (context?.locale as string) || 'en';
            prefetchedContext = await prefetchData(
              intentResult.dataRequirements,
              user.id,
              prefetchLocale
            );

            logDebug('Pre-fetch completed', {
              userId: user.id,
              metadata: {
                intent: intentResult.intent,
                requirementCount: intentResult.dataRequirements.length,
                totalLatencyMs: prefetchedContext.totalLatencyMs,
              },
            });
          }

          // Fast-path for simple factual questions
          if (
            intentResult.canAnswerDirectly &&
            intentResult.intent === 'simple_fact' &&
            prefetchedContext &&
            Object.keys(prefetchedContext.results).length > 0
          ) {
            const fastLocale = (context?.locale as string) || 'en';
            const fastAnswer = await generateFastAnswer(
              message,
              prefetchedContext.results,
              fastLocale
            );

            if (fastAnswer) {
              logInfo('Fast-path answer served', {
                userId: user.id,
                conversationId,
                metadata: {
                  intent: intentResult.intent,
                  latencyMs: requestTimer(),
                },
              });

              fullResponse = fastAnswer;
              const totalLatencyMs = requestTimer();
              controller.enqueue(encoder.encode(encodeTextEvent(fastAnswer)));
              controller.enqueue(encoder.encode(encodeDoneEvent(messageId, 'stop', undefined, totalLatencyMs)));

              recordAgentLatency(totalLatencyMs / 1000, 'simple');
              controller.close();
              return;
            }
          }

          // Build system prompt with memory context, loadout context, and parsed query constraints
          const { promptContext, loadoutContext } = await buildPromptContext(
            context,
            user.id,
            userSubscriptionTier,
            parsedQuery,
          );
          const systemPrompt = buildMastraSystemPrompt(promptContext);

          // Inject pre-fetched context into system prompt
          let enrichedPrompt = systemPrompt;
          if (prefetchedContext && prefetchedContext.formattedContext) {
            const contextLabel = (context?.locale as string) === 'de'
              ? '**Vorab geladene Daten (nutze diese um schnell zu antworten):**'
              : '**Pre-loaded Data (use this to answer quickly):**';
            enrichedPrompt = `${systemPrompt}\n\n${contextLabel}\n${prefetchedContext.formattedContext}`;

            logDebug('Pre-fetched context injected into prompt', {
              userId: user.id,
              metadata: {
                contextLength: prefetchedContext.formattedContext.length,
                intent: intentResult.intent,
              },
            });
          }

          // --- Phase 3: Agent generation (emit "thinking" progress) ---
          emitProgress('thinking', progressMessages[locale].thinking);

          // Create Mastra Agent with complexity-based model routing and stream response
          const { result: streamingResult } = await traceWorkflowStep(
            `chat-${conversationId}`,
            'agent_generation',
            async () => {
              const agent = createGearAgent(user.id, enrichedPrompt, intentResult.queryComplexity);
              return await streamMastraResponse(agent, message, user.id, conversationId, currentLoadoutId);
            },
            { userId: user.id }
          );

          // Stream text chunks
          let chunkCount = 0;
          for await (const chunk of streamingResult.textStream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(encodeTextEvent(chunk)));
            chunkCount++;
          }

          logDebug('Text stream completed', {
            userId: user.id,
            conversationId,
            metadata: {
              chunkCount,
              fullResponseLength: fullResponse.length,
              responsePreview: fullResponse.substring(0, 100),
            },
          });

          // Wait for tool calls and finish reason
          const [toolCalls, finishReason] = await Promise.all([
            streamingResult.toolCalls,
            streamingResult.finishReason,
          ]);

          logDebug('Streaming finished', {
            userId: user.id,
            conversationId,
            metadata: {
              finishReason,
              toolCallCount: toolCalls?.length || 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool calls have dynamic structure from AI SDK
              toolNames: toolCalls?.map((tc: any) => tc.toolName || tc.name || 'unknown').join(', ') || 'none',
            },
          });

          // Record tool call metrics (T031)
          if (toolCalls && Array.isArray(toolCalls)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool calls have dynamic structure from AI SDK
            for (const tc of toolCalls as any[]) {
              recordToolCall(tc.toolName || tc.name || 'unknown');

              // Detect addToLoadout tool results that require user confirmation
              // (Suspend/Resume pattern for human-in-the-loop write safety)
              // Uses ADD_TO_LOADOUT_TOOL_NAME constant to prevent silent breakage on rename.
              if (
                (tc.toolName === ADD_TO_LOADOUT_TOOL_NAME || tc.name === ADD_TO_LOADOUT_TOOL_NAME) &&
                isConfirmableResult(tc.result)
              ) {
                const confirmData: ConfirmActionData = {
                  runId: tc.result.runId,
                  actionType: 'add_to_loadout',
                  message: tc.result.message,
                  details: {
                    gearItemId: tc.result.gearItemId,
                    gearItemName: tc.result.gearItemName,
                    loadoutId: tc.result.loadoutId,
                    loadoutName: tc.result.loadoutName,
                  },
                };
                controller.enqueue(encoder.encode(encodeConfirmActionEvent(confirmData)));

                logDebug('Confirm action event emitted (suspend/resume)', {
                  userId: user.id,
                  conversationId,
                  metadata: {
                    runId: confirmData.runId,
                    gearItemName: confirmData.details.gearItemName,
                    loadoutName: confirmData.details.loadoutName,
                  },
                });
              }
            }
          }

          // BUGFIX: Detect empty responses and provide fallback message
          if (!fullResponse || fullResponse.trim().length === 0) {
            const fallbackMessage = toolCalls && toolCalls.length > 0
              ? "I apologize, but I'm having trouble accessing your data right now. This might be due to temporary rate limiting. Please try again in a moment, or rephrase your question."
              : "I apologize, but I wasn't able to generate a response. Please try asking your question again.";

            fullResponse = fallbackMessage;
            controller.enqueue(encoder.encode(encodeTextEvent(fallbackMessage)));

            logWarn('Empty AI response detected, injected fallback message', {
              userId: user.id,
              conversationId,
              metadata: {
                hadToolCalls: toolCalls?.length || 0,
                finishReason,
              },
            });
          }

          // Improvement #4: Add proactive suggestions to stream
          const isNaturalCompletion = finishReason === 'stop';
          if (isNaturalCompletion && shouldShowProactiveSuggestions(fullResponse.length, hadError)) {
            const suggestions = generateProactiveSuggestions(
              promptContext.userContext,
              loadoutContext,
              (context?.locale as 'en' | 'de') || 'en'
            );

            if (suggestions.length > 0) {
              const suggestionsText = formatSuggestionsForStream(
                suggestions,
                (context?.locale as 'en' | 'de') || 'en'
              );
              controller.enqueue(encoder.encode(encodeTextEvent(suggestionsText)));
              fullResponse += suggestionsText;

              logDebug('Proactive suggestions added to response', {
                userId: user.id,
                conversationId,
                metadata: {
                  suggestionCount: suggestions.length,
                  finishReason,
                },
              });
            }
          }

          // Record latency metrics (T031)
          const totalLatencyMs = requestTimer();
          recordAgentLatency(totalLatencyMs / 1000, queryType);

          // Send completion event
          controller.enqueue(
            encoder.encode(encodeDoneEvent(messageId, finishReason || 'stop', undefined, totalLatencyMs))
          );

          logInfo('Mastra chat request completed', {
            metadata: {
              messageId,
              latencyMs: totalLatencyMs,
              responseLength: fullResponse.length,
              toolCallCount: toolCalls?.length || 0,
              queryComplexity: intentResult.queryComplexity,
              intent: intentResult.intent,
            },
          });

          controller.close();
        } catch (streamError) {
          hadError = true;
          const errorMessage =
            streamError instanceof Error ? streamError.message : 'Unknown streaming error';

          logError('Streaming error', streamError instanceof Error ? streamError : undefined);
          recordChatError('stream_error');

          controller.enqueue(encoder.encode(encodeErrorEvent(errorMessage, 'STREAM_ERROR')));
          controller.close();
        } finally {
          clearLogContext();
        }
      },

      cancel() {
        logInfo('Client disconnected, stream cancelled');
        clearLogContext();
      },
    });

    // Return streaming response with rate limit headers and conversation ID
    const headers: Record<string, string> = {
      ...rateLimitHeaders,
      'X-Conversation-Id': conversationId,
    };

    return createStreamingResponse(stream, headers);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    logError('Mastra chat request failed', error instanceof Error ? error : undefined);
    recordChatError('server_error');
    clearLogContext();

    return createStreamingErrorResponse(errorMessage, 'SERVER_ERROR', 500);
  }
}

// =====================================================
// Method Not Allowed Handlers
// =====================================================

export function GET(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}

export function PUT(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}

export function DELETE(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}
