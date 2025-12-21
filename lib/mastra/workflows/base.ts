/**
 * Workflow Base Framework for Mastra Agentic Voice AI
 *
 * Feature: 001-mastra-agentic-voice
 * Task: T038 [US2]
 *
 * This module provides the execution engine for multi-step workflows.
 * Supports both parallel step execution (when no dependencies) and
 * sequential step execution (when dependencies exist).
 *
 * Key features:
 * - Parallel execution of independent steps
 * - Dependency-based sequential execution
 * - Timeout handling with configurable thresholds
 * - Execution tracking in workflow_executions table
 * - Integration with structured logging and OpenTelemetry tracing
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
} from '@/types/mastra';
import { logInfo, logError, logWorkflowStep, createTimer } from '@/lib/mastra/logging';
import { traceWorkflowStep } from '@/lib/mastra/tracing';

/**
 * Database record type for workflow_executions table.
 * This table may not exist in generated types if migration hasn't been applied.
 * Using explicit type to ensure type safety regardless of migration status.
 *
 * Note: Exported for use in tests and migrations.
 */
export interface WorkflowExecutionRecord {
  id: string;
  user_id: string;
  workflow_name: string;
  status: ExecutionStatus;
  current_step: string | null;
  step_results: Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Execution status for workflow and steps
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

/**
 * Result of a single step execution
 */
export interface StepExecutionResult<T = unknown> {
  stepId: string;
  status: ExecutionStatus;
  result?: T;
  error?: string;
  durationMs: number;
}

/**
 * Result of a complete workflow execution
 */
export interface WorkflowExecutionResult {
  executionId: string;
  workflowName: string;
  status: ExecutionStatus;
  stepResults: Record<string, StepExecutionResult>;
  totalDurationMs: number;
  error?: string;
}

/**
 * Step handler function type
 * Each step type has a handler that processes the step and returns a result
 */
export type StepHandler<T = unknown> = (
  step: WorkflowStep,
  context: WorkflowContext
) => Promise<T>;

/**
 * Step handler registry
 * Maps step types to their handler functions
 */
export type StepHandlerRegistry = Map<WorkflowStep['type'], StepHandler>;

/**
 * Options for workflow execution
 */
export interface WorkflowExecutorOptions {
  /**
   * Custom step handlers (overrides default handlers)
   */
  handlers?: StepHandlerRegistry;
  /**
   * Whether to track execution in the database
   * Default: true
   */
  trackExecution?: boolean;
  /**
   * Enable OpenTelemetry tracing
   * Default: true
   */
  enableTracing?: boolean;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Base error class for workflow execution errors
 */
export class WorkflowError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowError);
    }
  }
}

/**
 * Error thrown when workflow execution times out
 */
export class WorkflowTimeoutError extends WorkflowError {
  constructor(workflowName: string, maxDurationMs: number, actualDurationMs: number) {
    super(
      `Workflow "${workflowName}" timed out after ${actualDurationMs}ms (max: ${maxDurationMs}ms)`,
      'WORKFLOW_TIMEOUT',
      { workflowName, maxDurationMs, actualDurationMs }
    );
    this.name = 'WorkflowTimeoutError';
  }
}

/**
 * Error thrown when a workflow step fails
 */
export class StepExecutionError extends WorkflowError {
  readonly stepId: string;

  constructor(stepId: string, message: string, cause?: unknown) {
    super(
      `Step "${stepId}" failed: ${message}`,
      'STEP_EXECUTION_ERROR',
      { stepId, cause: cause instanceof Error ? cause.message : String(cause) }
    );
    this.name = 'StepExecutionError';
    this.stepId = stepId;
  }
}

/**
 * Error thrown when step dependencies are not met
 */
export class DependencyError extends WorkflowError {
  constructor(stepId: string, missingDependencies: string[]) {
    super(
      `Step "${stepId}" has unmet dependencies: ${missingDependencies.join(', ')}`,
      'DEPENDENCY_ERROR',
      { stepId, missingDependencies }
    );
    this.name = 'DependencyError';
  }
}

// ============================================================================
// Default Step Handlers
// ============================================================================

/**
 * Default handler for tool_call step type
 * Override this by providing a custom handler in the registry
 */
async function defaultToolCallHandler(
  step: WorkflowStep,
  _context: WorkflowContext
): Promise<unknown> {
  logInfo(`Tool call step "${step.id}" - using default handler (no-op)`, {
    workflowId: _context.executionId,
    metadata: { stepId: step.id, config: step.config },
  });
  // Default implementation is a no-op
  // Real implementations should provide a custom handler
  return { stepId: step.id, handledBy: 'default', config: step.config };
}

/**
 * Default handler for llm_reasoning step type
 */
async function defaultLlmReasoningHandler(
  step: WorkflowStep,
  _context: WorkflowContext
): Promise<unknown> {
  logInfo(`LLM reasoning step "${step.id}" - using default handler (no-op)`, {
    workflowId: _context.executionId,
    metadata: { stepId: step.id, config: step.config },
  });
  return { stepId: step.id, handledBy: 'default', config: step.config };
}

/**
 * Default handler for api_request step type
 */
async function defaultApiRequestHandler(
  step: WorkflowStep,
  _context: WorkflowContext
): Promise<unknown> {
  logInfo(`API request step "${step.id}" - using default handler (no-op)`, {
    workflowId: _context.executionId,
    metadata: { stepId: step.id, config: step.config },
  });
  return { stepId: step.id, handledBy: 'default', config: step.config };
}

/**
 * Default handler for parallel_group step type
 * This is handled specially by the executor
 */
async function defaultParallelGroupHandler(
  step: WorkflowStep,
  // Context is required by StepHandler interface but not used here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: WorkflowContext
): Promise<unknown> {
  // Parallel groups are handled by the executor itself
  // This handler should not be called directly
  throw new WorkflowError(
    'Parallel groups are handled by the executor',
    'INVALID_HANDLER_CALL',
    { stepId: step.id }
  );
}

/**
 * Create default step handler registry
 */
function createDefaultHandlers(): StepHandlerRegistry {
  const registry = new Map<WorkflowStep['type'], StepHandler>();
  registry.set('tool_call', defaultToolCallHandler);
  registry.set('llm_reasoning', defaultLlmReasoningHandler);
  registry.set('api_request', defaultApiRequestHandler);
  registry.set('parallel_group', defaultParallelGroupHandler);
  return registry;
}

// ============================================================================
// WorkflowExecutor Class
// ============================================================================

/**
 * WorkflowExecutor - Execution engine for multi-step workflows
 *
 * Handles:
 * - Parallel execution of independent steps (no dependencies)
 * - Sequential execution of dependent steps
 * - Timeout enforcement
 * - Execution tracking in database
 * - Structured logging and tracing
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 * import { WorkflowExecutor } from '@/lib/mastra/workflows/base';
 *
 * const supabase = await createClient();
 * const executor = new WorkflowExecutor(supabase, {
 *   handlers: customHandlerRegistry,
 * });
 *
 * const workflow: WorkflowDefinition = {
 *   name: 'trip-planner',
 *   description: 'Plan outdoor trip with gear recommendations',
 *   maxDurationMs: 30000,
 *   steps: [
 *     { id: 'intent', type: 'llm_reasoning', dependencies: [], config: {} },
 *     { id: 'weather', type: 'api_request', dependencies: ['intent'], config: {} },
 *     { id: 'gear', type: 'tool_call', dependencies: ['intent'], config: {} },
 *     { id: 'synthesis', type: 'llm_reasoning', dependencies: ['weather', 'gear'], config: {} },
 *   ],
 * };
 *
 * const result = await executor.execute(workflow, {
 *   userId: 'user-123',
 *   input: { location: 'Stockholm', season: 'winter' },
 * });
 * ```
 */
export class WorkflowExecutor {
  // Using generic SupabaseClient since workflow_executions table may not be in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly supabase: SupabaseClient<any>;
  private readonly handlers: StepHandlerRegistry;
  private readonly trackExecution: boolean;
  private readonly enableTracing: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(supabaseClient: SupabaseClient<any>, options?: WorkflowExecutorOptions) {
    this.supabase = supabaseClient;
    this.handlers = options?.handlers ?? createDefaultHandlers();
    this.trackExecution = options?.trackExecution ?? true;
    this.enableTracing = options?.enableTracing ?? true;
  }

  /**
   * Execute a workflow with the given input
   *
   * @param workflow - Workflow definition to execute
   * @param input - Input parameters for the workflow
   * @returns Workflow execution result
   * @throws WorkflowTimeoutError if execution exceeds maxDurationMs
   * @throws StepExecutionError if a step fails
   */
  async execute(
    workflow: WorkflowDefinition,
    input: { userId: string; input: Record<string, unknown> }
  ): Promise<WorkflowExecutionResult> {
    const getElapsed = createTimer();
    const executionId = crypto.randomUUID();

    // Create workflow context
    const context: WorkflowContext = {
      userId: input.userId,
      executionId,
      input: input.input,
      stepResults: {},
      startedAt: new Date(),
    };

    logInfo(`Starting workflow "${workflow.name}"`, {
      userId: input.userId,
      workflowId: executionId,
      metadata: { workflowName: workflow.name, stepCount: workflow.steps.length },
    });

    // Track execution in database
    if (this.trackExecution) {
      await this.createExecutionRecord(executionId, input.userId, workflow.name);
    }

    const stepResults: Record<string, StepExecutionResult> = {};
    let workflowStatus: ExecutionStatus = 'running';
    let workflowError: string | undefined;

    try {
      // Validate workflow has no circular dependencies
      this.validateDependencies(workflow.steps);

      // Execute steps in dependency order
      await this.executeSteps(workflow, context, stepResults, getElapsed);

      workflowStatus = 'completed';
      logInfo(`Workflow "${workflow.name}" completed successfully`, {
        userId: input.userId,
        workflowId: executionId,
        metadata: { durationMs: getElapsed() },
      });
    } catch (error) {
      if (error instanceof WorkflowTimeoutError) {
        workflowStatus = 'timeout';
      } else {
        workflowStatus = 'failed';
      }
      workflowError = error instanceof Error ? error.message : String(error);

      logError(`Workflow "${workflow.name}" failed`, error, {
        userId: input.userId,
        workflowId: executionId,
      });
    } finally {
      // Update execution record
      if (this.trackExecution) {
        await this.updateExecutionRecord(
          executionId,
          workflowStatus,
          stepResults,
          workflowError
        );
      }
    }

    return {
      executionId,
      workflowName: workflow.name,
      status: workflowStatus,
      stepResults,
      totalDurationMs: getElapsed(),
      error: workflowError,
    };
  }

  /**
   * Execute steps in dependency order
   * Steps with no unmet dependencies can run in parallel
   */
  private async executeSteps(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    stepResults: Record<string, StepExecutionResult>,
    getElapsed: () => number
  ): Promise<void> {
    const completedSteps = new Set<string>();
    const remainingSteps = new Map(workflow.steps.map((s) => [s.id, s]));

    while (remainingSteps.size > 0) {
      // Check timeout
      const elapsed = getElapsed();
      if (elapsed >= workflow.maxDurationMs) {
        throw new WorkflowTimeoutError(workflow.name, workflow.maxDurationMs, elapsed);
      }

      // Find steps that can be executed (all dependencies satisfied)
      const readySteps = this.findReadySteps(remainingSteps, completedSteps);

      if (readySteps.length === 0 && remainingSteps.size > 0) {
        // This should not happen if validateDependencies passed
        const stuckStepIds = Array.from(remainingSteps.keys());
        throw new DependencyError(stuckStepIds[0], stuckStepIds);
      }

      // Execute ready steps in parallel
      const results = await this.executeParallelSteps(
        readySteps,
        context,
        workflow.maxDurationMs - elapsed
      );

      // Process results
      for (const result of results) {
        stepResults[result.stepId] = result;
        context.stepResults[result.stepId] = result.result;
        completedSteps.add(result.stepId);
        remainingSteps.delete(result.stepId);

        // If any step failed, abort the workflow
        if (result.status === 'failed') {
          throw new StepExecutionError(result.stepId, result.error ?? 'Unknown error');
        }
      }
    }
  }

  /**
   * Find steps that are ready to execute (all dependencies satisfied)
   */
  private findReadySteps(
    remainingSteps: Map<string, WorkflowStep>,
    completedSteps: Set<string>
  ): WorkflowStep[] {
    const readySteps: WorkflowStep[] = [];

    for (const step of remainingSteps.values()) {
      const allDependenciesMet = step.dependencies.every((dep) => completedSteps.has(dep));
      if (allDependenciesMet) {
        readySteps.push(step);
      }
    }

    return readySteps;
  }

  /**
   * Execute multiple steps in parallel with timeout
   */
  private async executeParallelSteps(
    steps: WorkflowStep[],
    context: WorkflowContext,
    remainingTimeMs: number
  ): Promise<StepExecutionResult[]> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new WorkflowTimeoutError('parallel_execution', remainingTimeMs, remainingTimeMs));
      }, remainingTimeMs);
    });

    // Execute all steps in parallel
    const stepPromises = steps.map((step) => this.executeStep(step, context));

    // Race against timeout
    try {
      const results = await Promise.race([
        Promise.all(stepPromises),
        timeoutPromise,
      ]);
      return results;
    } catch (error) {
      if (error instanceof WorkflowTimeoutError) {
        // Return partial results with timeout status for remaining steps
        // In a real implementation, you might want to cancel pending steps
        throw error;
      }
      throw error;
    }
  }

  /**
   * Execute a single step with tracing and logging
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    const getStepElapsed = createTimer();

    logWorkflowStep(context.executionId, step.id, 'started');

    // Update current step in database
    if (this.trackExecution) {
      await this.updateCurrentStep(context.executionId, step.id);
    }

    try {
      let result: unknown;

      if (this.enableTracing) {
        const traced = await traceWorkflowStep(
          context.executionId,
          step.id,
          async () => this.executeStepHandler(step, context),
          { userId: context.userId }
        );
        result = traced.result;
      } else {
        result = await this.executeStepHandler(step, context);
      }

      const durationMs = getStepElapsed();
      logWorkflowStep(context.executionId, step.id, 'completed', durationMs);

      return {
        stepId: step.id,
        status: 'completed',
        result,
        durationMs,
      };
    } catch (error) {
      const durationMs = getStepElapsed();
      const errorMessage = error instanceof Error ? error.message : String(error);

      logWorkflowStep(context.executionId, step.id, 'failed', durationMs, error);

      return {
        stepId: step.id,
        status: 'failed',
        error: errorMessage,
        durationMs,
      };
    }
  }

  /**
   * Execute the handler for a step type
   */
  private async executeStepHandler(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<unknown> {
    const handler = this.handlers.get(step.type);

    if (!handler) {
      throw new WorkflowError(
        `No handler registered for step type: ${step.type}`,
        'NO_HANDLER',
        { stepId: step.id, stepType: step.type }
      );
    }

    return handler(step, context);
  }

  /**
   * Validate that workflow dependencies form a DAG (no cycles)
   */
  private validateDependencies(steps: WorkflowStep[]): void {
    const stepIds = new Set(steps.map((s) => s.id));
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const stepMap = new Map(steps.map((s) => [s.id, s]));

    const visit = (stepId: string): void => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        throw new WorkflowError(
          `Circular dependency detected at step: ${stepId}`,
          'CIRCULAR_DEPENDENCY',
          { stepId }
        );
      }

      const step = stepMap.get(stepId);
      if (!step) return;

      // Check all dependencies exist
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          throw new DependencyError(stepId, [dep]);
        }
      }

      visiting.add(stepId);

      for (const dep of step.dependencies) {
        visit(dep);
      }

      visiting.delete(stepId);
      visited.add(stepId);
    };

    for (const step of steps) {
      visit(step.id);
    }
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  /**
   * Create initial execution record in database
   */
  private async createExecutionRecord(
    executionId: string,
    userId: string,
    workflowName: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('workflow_executions').insert({
        id: executionId,
        user_id: userId,
        workflow_name: workflowName,
        status: 'running' as const,
        current_step: null,
        step_results: {},
        started_at: new Date().toISOString(),
      });

      if (error) {
        logError('Failed to create workflow execution record', error, {
          workflowId: executionId,
          userId,
        });
        // Don't throw - tracking failure shouldn't stop workflow execution
      }
    } catch (error) {
      logError('Exception creating workflow execution record', error, {
        workflowId: executionId,
        userId,
      });
    }
  }

  /**
   * Update current step in database
   */
  private async updateCurrentStep(executionId: string, stepId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('workflow_executions')
        .update({ current_step: stepId })
        .eq('id', executionId);

      if (error) {
        logError('Failed to update current step', error, {
          workflowId: executionId,
          metadata: { stepId },
        });
      }
    } catch (error) {
      logError('Exception updating current step', error, {
        workflowId: executionId,
        metadata: { stepId },
      });
    }
  }

  /**
   * Update execution record with final status
   */
  private async updateExecutionRecord(
    executionId: string,
    status: ExecutionStatus,
    stepResults: Record<string, StepExecutionResult>,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('workflow_executions')
        .update({
          status,
          step_results: stepResults as unknown as Record<string, unknown>,
          error_message: errorMessage ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      if (error) {
        logError('Failed to update workflow execution record', error, {
          workflowId: executionId,
          metadata: { status },
        });
      }
    } catch (error) {
      logError('Exception updating workflow execution record', error, {
        workflowId: executionId,
        metadata: { status },
      });
    }
  }

  // ==========================================================================
  // Handler Registration
  // ==========================================================================

  /**
   * Register a custom handler for a step type
   */
  registerHandler(stepType: WorkflowStep['type'], handler: StepHandler): void {
    this.handlers.set(stepType, handler);
  }

  /**
   * Get the current handler for a step type
   */
  getHandler(stepType: WorkflowStep['type']): StepHandler | undefined {
    return this.handlers.get(stepType);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a WorkflowExecutor instance with default configuration
 *
 * @param supabaseClient - Supabase client for database operations
 * @param options - Optional configuration
 * @returns Configured WorkflowExecutor instance
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 * import { createWorkflowExecutor } from '@/lib/mastra/workflows/base';
 *
 * const supabase = await createClient();
 * const executor = createWorkflowExecutor(supabase);
 *
 * // Register custom handlers
 * executor.registerHandler('tool_call', async (step, context) => {
 *   // Custom tool call implementation
 *   return mcpClient.call(step.config.toolName, step.config.args);
 * });
 * ```
 */
export function createWorkflowExecutor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: SupabaseClient<any>,
  options?: WorkflowExecutorOptions
): WorkflowExecutor {
  return new WorkflowExecutor(supabaseClient, options);
}

/**
 * Create a step handler registry with default handlers
 *
 * @returns New StepHandlerRegistry with default handlers
 */
export function createStepHandlerRegistry(): StepHandlerRegistry {
  return createDefaultHandlers();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build a topological sort of workflow steps
 * Useful for visualization and debugging
 *
 * @param steps - Workflow steps to sort
 * @returns Ordered array of step IDs
 */
export function topologicalSort(steps: WorkflowStep[]): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  const visit = (stepId: string): void => {
    if (visited.has(stepId)) return;
    visited.add(stepId);

    const step = stepMap.get(stepId);
    if (step) {
      for (const dep of step.dependencies) {
        visit(dep);
      }
    }

    result.push(stepId);
  };

  for (const step of steps) {
    visit(step.id);
  }

  return result;
}

/**
 * Get execution order groups (steps that can run in parallel)
 * Useful for visualization and optimization
 *
 * @param steps - Workflow steps to analyze
 * @returns Array of step ID groups, where each group can run in parallel
 */
export function getExecutionGroups(steps: WorkflowStep[]): string[][] {
  const groups: string[][] = [];
  const completed = new Set<string>();
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const remaining = new Set(steps.map((s) => s.id));

  while (remaining.size > 0) {
    const currentGroup: string[] = [];

    for (const stepId of remaining) {
      const step = stepMap.get(stepId);
      if (step && step.dependencies.every((dep) => completed.has(dep))) {
        currentGroup.push(stepId);
      }
    }

    if (currentGroup.length === 0) {
      // This shouldn't happen with valid dependencies
      break;
    }

    groups.push(currentGroup);

    for (const stepId of currentGroup) {
      completed.add(stepId);
      remaining.delete(stepId);
    }
  }

  return groups;
}
