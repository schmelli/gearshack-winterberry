/**
 * useAIOrchestration Hook
 * Feature 050: AI Assistant - Phase 2A
 *
 * Client-side state machine for managing multi-step tool orchestration.
 * Handles Phase 1 -> Phase 2 transitions and UI progress updates.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { logAIEvent } from '@/lib/ai-assistant/observability';
import { useLocale } from 'next-intl';
import { useItems } from '@/hooks/useSupabaseStore';

// =====================================================
// Types
// =====================================================

/**
 * Orchestration state machine states
 */
export type OrchestrationStatus =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'step_complete'
  | 'completed'
  | 'failed';

/**
 * Individual step in an orchestration plan
 */
export interface OrchestrationStep {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  dependsOn?: string[];
}

/**
 * Orchestration plan from Phase 1
 */
export interface OrchestrationPlan {
  steps: OrchestrationStep[];
}

/**
 * Result of a single step execution
 */
export interface StepResult {
  stepId: string;
  tool: string;
  success: boolean;
  data: unknown;
  error: string | null;
  attempts: number;
  durationMs: number;
}

/**
 * Complete orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  stepResults: StepResult[];
  totalDurationMs: number;
  parallelGroups: number;
  failedSteps: string[];
}

/**
 * Stream event from orchestration API
 */
interface OrchestrationStreamEvent {
  type: 'step_start' | 'step_complete' | 'plan_complete' | 'error';
  stepId?: string;
  tool?: string;
  result?: StepResult;
  orchestrationResult?: OrchestrationResult;
  error?: string;
  timestamp: string;
}

/**
 * Hook return type
 */
export interface UseAIOrchestrationResult {
  /** Current state of orchestration */
  status: OrchestrationStatus;
  /** The plan being executed */
  currentPlan: OrchestrationPlan | null;
  /** Results of completed steps */
  completedSteps: StepResult[];
  /** Currently executing step (if any) */
  currentStep: OrchestrationStep | null;
  /** Final orchestration result (when completed) */
  result: OrchestrationResult | null;
  /** Error message if failed */
  error: string | null;
  /** Execute an orchestration plan */
  executePlan: (plan: OrchestrationPlan, conversationId?: string) => Promise<OrchestrationResult | null>;
  /** Reset state to idle */
  reset: () => void;
  /** Progress percentage (0-100) */
  progress: number;
}

// =====================================================
// Hook Implementation
// =====================================================

/**
 * Hook for managing AI tool orchestration
 *
 * Provides a state machine for executing multi-step tool plans,
 * handling Phase 1 (planning) to Phase 2 (execution) transitions.
 *
 * @returns Orchestration state and control functions
 */
export function useAIOrchestration(): UseAIOrchestrationResult {
  const [status, setStatus] = useState<OrchestrationStatus>('idle');
  const [currentPlan, setCurrentPlan] = useState<OrchestrationPlan | null>(null);
  const [completedSteps, setCompletedSteps] = useState<StepResult[]>([]);
  const [currentStep, setCurrentStep] = useState<OrchestrationStep | null>(null);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthContext();
  const locale = useLocale();
  const items = useItems();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate progress percentage
  const progress = currentPlan
    ? Math.round((completedSteps.length / currentPlan.steps.length) * 100)
    : 0;

  /**
   * Execute an orchestration plan via the API
   */
  const executePlan = useCallback(
    async (
      plan: OrchestrationPlan,
      conversationId?: string
    ): Promise<OrchestrationResult | null> => {
      if (!user) {
        setError('You must be logged in to execute tool plans');
        setStatus('failed');
        return null;
      }

      // Reset state
      setStatus('planning');
      setCurrentPlan(plan);
      setCompletedSteps([]);
      setCurrentStep(null);
      setResult(null);
      setError(null);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        logAIEvent('info', 'Starting orchestration execution', {
          userId: user.uid,
          stepCount: plan.steps.length,
        });

        setStatus('executing');

        // Build context
        const context = {
          screen: 'ai-assistant',
          locale,
          inventoryCount: items.length,
        };

        // Call orchestration API
        const response = await fetch('/api/ai-assistant/orchestrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId || null,
            plan,
            context,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        // Check for streaming response
        if (!response.body) {
          throw new Error('No response body');
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: OrchestrationResult | null = null;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: OrchestrationStreamEvent = JSON.parse(line.slice(6));

                switch (event.type) {
                  case 'step_start':
                    if (event.stepId) {
                      const step = plan.steps.find(s => s.id === event.stepId);
                      setCurrentStep(step || null);
                    }
                    break;

                  case 'step_complete':
                    if (event.result) {
                      setCompletedSteps(prev => [...prev, event.result!]);
                      setStatus('step_complete');
                      setCurrentStep(null);
                    }
                    break;

                  case 'plan_complete':
                    if (event.orchestrationResult) {
                      finalResult = event.orchestrationResult;
                      setResult(finalResult);
                      setStatus(finalResult.success ? 'completed' : 'failed');

                      if (!finalResult.success && finalResult.failedSteps.length > 0) {
                        setError(`Failed steps: ${finalResult.failedSteps.join(', ')}`);
                      }
                    }
                    break;

                  case 'error':
                    setError(event.error || 'Unknown error');
                    setStatus('failed');
                    break;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line);
              }
            }
          }
        }

        logAIEvent('info', 'Orchestration stream completed', {
          userId: user.uid,
          success: finalResult?.success,
          stepCount: finalResult?.stepResults.length,
        });

        return finalResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to execute plan';

        // Don't set error for abort
        if (errorMessage !== 'The user aborted a request.') {
          setError(errorMessage);
          setStatus('failed');

          logAIEvent('error', 'Orchestration failed', {
            userId: user.uid,
            error: errorMessage,
          });
        }

        return null;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [user, locale, items]
  );

  /**
   * Reset state to idle
   */
  const reset = useCallback(() => {
    // Abort any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus('idle');
    setCurrentPlan(null);
    setCompletedSteps([]);
    setCurrentStep(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    currentPlan,
    completedSteps,
    currentStep,
    result,
    error,
    executePlan,
    reset,
    progress,
  };
}
