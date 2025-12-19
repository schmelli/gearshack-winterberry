/**
 * AI Assistant Orchestration API Route
 * Feature 050: AI Assistant - Phase 2A
 *
 * Executes multi-step tool plans with dependency resolution.
 * Streams results to client and logs executions to ai_tool_execution_logs.
 */

import { createClient } from '@/lib/supabase/server';
import {
  executeOrchestrationPlan,
  validateOrchestrationPlan,
  OrchestrationPlan,
  OrchestrationResult,
  StepResult,
} from '@/lib/ai-assistant/orchestrator';
import { recordToolCall, logAIEvent } from '@/lib/ai-assistant/observability';

// Use Edge runtime for streaming
export const runtime = 'edge';

// =====================================================
// Types
// =====================================================

interface OrchestrationRequest {
  conversationId: string | null;
  plan: OrchestrationPlan;
  context: {
    screen: string;
    locale: string;
    inventoryCount: number;
    currentLoadoutId?: string;
  };
}

interface OrchestrationStreamEvent {
  type: 'step_start' | 'step_complete' | 'plan_complete' | 'error';
  stepId?: string;
  tool?: string;
  result?: StepResult;
  orchestrationResult?: OrchestrationResult;
  error?: string;
  timestamp: string;
}

// =====================================================
// Helpers
// =====================================================

/**
 * Create a Server-Sent Event formatted string
 */
function formatSSE(event: OrchestrationStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Log tool execution to database
 */
async function logToolExecution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string | null,
  stepResult: StepResult
): Promise<void> {
  // Skip logging if no conversation ID (can't insert without FK)
  if (!conversationId) {
    console.log('Skipping tool execution log - no conversation ID');
    return;
  }

  try {
    const insertData = {
      conversation_id: conversationId,
      role: 'assistant' as const,
      content: `Tool executed: ${stepResult.tool}`,
      tool_calls: [
        {
          tool_name: stepResult.tool,
          call_id: stepResult.stepId,
          status: stepResult.success ? 'success' : 'error',
          result: stepResult.success ? stepResult.data : undefined,
          error: stepResult.error || undefined,
        },
      ],
      orchestration_metadata: {
        attempts: stepResult.attempts,
        duration_ms: stepResult.durationMs,
        step_id: stepResult.stepId,
      },
    };

    await supabase.from('ai_messages').insert([insertData]);
  } catch (error) {
    // Log but don't fail the request
    console.error('Failed to log tool execution:', error);
  }
}

// =====================================================
// Main Handler
// =====================================================

export async function POST(request: Request) {
  const supabase = await createClient();
  const encoder = new TextEncoder();

  try {
    const body: OrchestrationRequest = await request.json();
    const { conversationId, plan, context } = body;

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'You must be logged in to use the AI assistant' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check subscription tier (Trailblazer only for MVP)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify account status' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionTier = (profile as { subscription_tier?: string }).subscription_tier || 'standard';

    if (subscriptionTier !== 'trailblazer') {
      return new Response(
        JSON.stringify({ error: 'AI assistant is only available for Trailblazer subscribers' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate the orchestration plan
    const validation = validateOrchestrationPlan(plan);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid orchestration plan',
          details: validation.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Rate limit check
    const { data: rateLimitDataRaw, error: rateLimitError } = await supabase.rpc(
      'check_and_increment_rate_limit',
      {
        p_user_id: user.id,
        p_endpoint: '/api/ai-assistant/orchestrate',
        p_limit: 50, // Lower limit for orchestration (more expensive)
        p_window_hours: 1,
      }
    );

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Unable to process request. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rateLimitData = rateLimitDataRaw as { exceeded: boolean; limit: number; resets_at: string } | null;

    if (rateLimitData?.exceeded) {
      logAIEvent('warn', 'Rate limit exceeded for orchestration', {
        userId: user.id,
        endpoint: '/api/ai-assistant/orchestrate',
      });

      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. You can execute ${rateLimitData.limit} tool plans per hour. Resets at ${new Date(rateLimitData.resets_at).toLocaleTimeString()}.`,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          logAIEvent('info', 'Starting orchestration execution', {
            userId: user.id,
            conversationId,
            stepCount: plan.steps.length,
          });

          // Execute the orchestration plan
          const orchestrationContext = {
            userId: user.id,
            locale: context.locale,
            conversationId: conversationId || undefined,
          };

          // We'll emit events as steps complete
          const completedSteps: StepResult[] = [];

          // Execute plan and stream results
          const result = await executeOrchestrationPlan(plan, orchestrationContext);

          // Stream each step result
          for (const stepResult of result.stepResults) {
            // Emit step complete event
            const event: OrchestrationStreamEvent = {
              type: 'step_complete',
              stepId: stepResult.stepId,
              tool: stepResult.tool,
              result: stepResult,
              timestamp: new Date().toISOString(),
            };

            controller.enqueue(encoder.encode(formatSSE(event)));

            // Log to database
            await logToolExecution(supabase, user.id, conversationId, stepResult);

            // Record metrics
            recordToolCall(
              stepResult.tool,
              stepResult.success ? 'success' : 'error',
              stepResult.durationMs
            );

            completedSteps.push(stepResult);
          }

          // Emit plan complete event
          const completeEvent: OrchestrationStreamEvent = {
            type: 'plan_complete',
            orchestrationResult: result,
            timestamp: new Date().toISOString(),
          };

          controller.enqueue(encoder.encode(formatSSE(completeEvent)));

          logAIEvent('info', 'Orchestration completed', {
            userId: user.id,
            conversationId,
            success: result.success,
            totalSteps: result.stepResults.length,
            failedSteps: result.failedSteps.length,
            durationMs: result.totalDurationMs,
            parallelGroups: result.parallelGroups,
          });

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          logAIEvent('error', 'Orchestration failed', {
            userId: user.id,
            conversationId,
            error: errorMessage,
          });

          const errorEvent: OrchestrationStreamEvent = {
            type: 'error',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          };

          controller.enqueue(encoder.encode(formatSSE(errorEvent)));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in orchestration endpoint:', error);

    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/ai-assistant/orchestrate',
      version: '2.0.0',
      features: ['multi-step', 'dependency-resolution', 'parallel-execution', 'retry-logic'],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
