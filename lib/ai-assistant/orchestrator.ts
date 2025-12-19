/**
 * Multi-step Tool Orchestration Engine
 * Feature 050: AI Assistant - Phase 2A
 *
 * Executes tool chains with dependency resolution, parallel execution,
 * and result passing between steps.
 */

import { executeToolWithRetry, ToolExecutionResult } from './tool-executor';

// =====================================================
// Constants
// =====================================================

/**
 * Maximum number of steps allowed in an orchestration plan
 * Prevents memory leaks from unbounded completedResults Map
 */
const MAX_PLAN_STEPS = 50;

/**
 * Maximum size of step arguments (in JSON string length)
 * Prevents memory exhaustion from large data structures
 */
const MAX_STEP_ARGS_SIZE = 100000; // 100KB

// =====================================================
// Types
// =====================================================

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
 * Complete orchestration plan from Phase 1
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
 * Context passed through orchestration
 */
export interface OrchestrationContext {
  userId: string;
  locale: string;
  conversationId?: string;
}

// =====================================================
// Reference Resolution
// =====================================================

/**
 * Pattern for variable references: $step_id.path.to.value
 * Examples:
 *   - $search_tents.results[0:3].id
 *   - $search_tents.results[0].name
 *   - $compare_results.winner.id
 */
const REFERENCE_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_]*)((?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+(?::\d+)?\])*)/g;

/**
 * Parse a path expression like ".results[0:3].id" into segments
 */
function parsePathSegments(path: string): Array<string | number | { start: number; end: number }> {
  const segments: Array<string | number | { start: number; end: number }> = [];
  const pathPattern = /\.([a-zA-Z_][a-zA-Z0-9_]*)|\[(\d+)(?::(\d+))?\]/g;
  let match;

  while ((match = pathPattern.exec(path)) !== null) {
    if (match[1]) {
      // Property access: .property
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      if (match[3] !== undefined) {
        // Array slice: [start:end]
        segments.push({ start: parseInt(match[2], 10), end: parseInt(match[3], 10) });
      } else {
        // Array index: [index]
        segments.push(parseInt(match[2], 10));
      }
    }
  }

  return segments;
}

/**
 * Resolve a value from an object using path segments
 */
function resolveValue(obj: unknown, segments: Array<string | number | { start: number; end: number }>): unknown {
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof segment === 'string') {
      // Property access
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    } else if (typeof segment === 'number') {
      // Array index
      if (Array.isArray(current)) {
        current = current[segment];
      } else {
        return undefined;
      }
    } else if (typeof segment === 'object' && 'start' in segment) {
      // Array slice
      if (Array.isArray(current)) {
        current = current.slice(segment.start, segment.end);
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * Resolve all variable references in an args object
 */
function resolveReferences(
  args: Record<string, unknown>,
  completedResults: Map<string, StepResult>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      // Check for reference pattern in string
      const matches = [...value.matchAll(REFERENCE_PATTERN)];

      if (matches.length > 0) {
        // If the entire value is a reference, replace with resolved value
        if (matches.length === 1 && matches[0][0] === value) {
          const stepId = matches[0][1];
          const path = matches[0][2] || '';
          const stepResult = completedResults.get(stepId);

          if (stepResult?.success && stepResult.data) {
            const segments = parsePathSegments(path);
            resolved[key] = resolveValue(stepResult.data, segments);
          } else {
            resolved[key] = undefined;
          }
        } else {
          // Multiple references or partial references - string interpolation
          let interpolated = value;
          for (const match of matches) {
            const stepId = match[1];
            const path = match[2] || '';
            const stepResult = completedResults.get(stepId);

            if (stepResult?.success && stepResult.data) {
              const segments = parsePathSegments(path);
              const resolvedValue = resolveValue(stepResult.data, segments);
              interpolated = interpolated.replace(match[0], String(resolvedValue ?? ''));
            }
          }
          resolved[key] = interpolated;
        }
      } else {
        resolved[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Recursively resolve arrays
      resolved[key] = value.map(item => {
        if (typeof item === 'string') {
          const match = item.match(REFERENCE_PATTERN);
          if (match) {
            return resolveReferences({ temp: item }, completedResults).temp;
          }
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      // Recursively resolve nested objects
      resolved[key] = resolveReferences(value as Record<string, unknown>, completedResults);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

// =====================================================
// Topological Sort for Dependency Resolution
// =====================================================

/**
 * Perform topological sort to determine execution order
 * Returns groups of steps that can be executed in parallel
 */
function topologicalSort(steps: OrchestrationStep[]): OrchestrationStep[][] {
  // Build dependency graph
  const stepMap = new Map<string, OrchestrationStep>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of steps) {
    stepMap.set(step.id, step);
    inDegree.set(step.id, step.dependsOn?.length || 0);
    dependents.set(step.id, []);
  }

  // Build reverse dependency graph
  for (const step of steps) {
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        if (dependents.has(dep)) {
          dependents.get(dep)!.push(step.id);
        }
      }
    }
  }

  // Kahn's algorithm with level tracking
  const result: OrchestrationStep[][] = [];
  const queue: string[] = [];

  // Find all steps with no dependencies
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    // Process all steps at current level in parallel
    const currentLevel: OrchestrationStep[] = [];
    const nextQueue: string[] = [];

    for (const id of queue) {
      const step = stepMap.get(id)!;
      currentLevel.push(step);

      // Update dependents
      for (const depId of dependents.get(id)!) {
        const newDegree = inDegree.get(depId)! - 1;
        inDegree.set(depId, newDegree);
        if (newDegree === 0) {
          nextQueue.push(depId);
        }
      }
    }

    result.push(currentLevel);
    queue.length = 0;
    queue.push(...nextQueue);
  }

  // Check for cycles
  const processedCount = result.reduce((sum, level) => sum + level.length, 0);
  if (processedCount !== steps.length) {
    throw new Error('Circular dependency detected in orchestration plan');
  }

  return result;
}

// =====================================================
// Main Orchestration Engine
// =====================================================

/**
 * Execute an orchestration plan with dependency resolution
 *
 * @param plan - The orchestration plan from Phase 1
 * @param context - User context (userId, locale, etc.)
 * @returns Complete orchestration result with all step results
 */
export async function executeOrchestrationPlan(
  plan: OrchestrationPlan,
  context: OrchestrationContext
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  const completedResults = new Map<string, StepResult>();
  const failedSteps: string[] = [];

  // Validate plan first
  if (!plan.steps || plan.steps.length === 0) {
    return {
      success: true,
      stepResults: [],
      totalDurationMs: Date.now() - startTime,
      parallelGroups: 0,
      failedSteps: [],
    };
  }

  // Validate plan structure and size limits
  const validation = validateOrchestrationPlan(plan);
  if (!validation.valid) {
    console.error('[Orchestrator] Invalid plan:', validation.errors);
    return {
      success: false,
      stepResults: [],
      totalDurationMs: Date.now() - startTime,
      parallelGroups: 0,
      failedSteps: plan.steps.map((s) => s.id),
    };
  }

  // Topologically sort steps for dependency resolution
  let executionGroups: OrchestrationStep[][];
  try {
    executionGroups = topologicalSort(plan.steps);
  } catch (error) {
    return {
      success: false,
      stepResults: [],
      totalDurationMs: Date.now() - startTime,
      parallelGroups: 0,
      failedSteps: plan.steps.map(s => s.id),
    };
  }

  // Execute each group (steps within a group run in parallel)
  for (const group of executionGroups) {
    const groupPromises = group.map(async (step) => {
      // Check if all dependencies succeeded
      const depsFailed = step.dependsOn?.some(depId => {
        const depResult = completedResults.get(depId);
        return !depResult || !depResult.success;
      });

      if (depsFailed) {
        const result: StepResult = {
          stepId: step.id,
          tool: step.tool,
          success: false,
          data: null,
          error: 'Dependency failed',
          attempts: 0,
          durationMs: 0,
        };
        return result;
      }

      // Resolve argument references
      const resolvedArgs = resolveReferences(step.args, completedResults);

      // Execute tool with retry
      const stepStart = Date.now();
      const executionResult: ToolExecutionResult = await executeToolWithRetry(
        step.tool,
        resolvedArgs,
        context,
        { maxAttempts: 3, timeoutMs: 30000 }
      );

      const result: StepResult = {
        stepId: step.id,
        tool: step.tool,
        success: executionResult.success,
        data: executionResult.data,
        error: executionResult.error,
        attempts: executionResult.attempts,
        durationMs: Date.now() - stepStart,
      };

      return result;
    });

    // Wait for all steps in group to complete
    const groupResults = await Promise.all(groupPromises);

    // Store results
    for (const result of groupResults) {
      stepResults.push(result);
      completedResults.set(result.stepId, result);
      if (!result.success) {
        failedSteps.push(result.stepId);
      }
    }
  }

  return {
    success: failedSteps.length === 0,
    stepResults,
    totalDurationMs: Date.now() - startTime,
    parallelGroups: executionGroups.length,
    failedSteps,
  };
}

/**
 * Validate an orchestration plan before execution
 *
 * @param plan - The orchestration plan to validate
 * @returns Validation result with any errors
 */
export function validateOrchestrationPlan(plan: OrchestrationPlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!plan || !plan.steps) {
    errors.push('Plan must have a steps array');
    return { valid: false, errors };
  }

  // Validate plan size to prevent memory leaks
  if (plan.steps.length > MAX_PLAN_STEPS) {
    errors.push(
      `Plan exceeds maximum steps limit (${plan.steps.length} > ${MAX_PLAN_STEPS})`
    );
    return { valid: false, errors };
  }

  const stepIds = new Set<string>();

  for (const step of plan.steps) {
    // Check required fields
    if (!step.id) {
      errors.push('Each step must have an id');
    }
    if (!step.tool) {
      errors.push(`Step ${step.id || 'unknown'} must have a tool`);
    }
    if (!step.args || typeof step.args !== 'object') {
      errors.push(`Step ${step.id || 'unknown'} must have args object`);
    }

    // Validate args size to prevent memory exhaustion
    try {
      const argsSize = JSON.stringify(step.args).length;
      if (argsSize > MAX_STEP_ARGS_SIZE) {
        errors.push(
          `Step ${step.id} args exceed maximum size (${argsSize} > ${MAX_STEP_ARGS_SIZE} bytes)`
        );
      }
    } catch (error) {
      errors.push(`Step ${step.id} has non-serializable args`);
    }

    // Check for duplicate IDs
    if (step.id && stepIds.has(step.id)) {
      errors.push(`Duplicate step id: ${step.id}`);
    }
    stepIds.add(step.id);

    // Check dependencies exist
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        if (!plan.steps.some(s => s.id === dep)) {
          errors.push(`Step ${step.id} depends on unknown step: ${dep}`);
        }
      }
    }
  }

  // Check for cycles
  try {
    topologicalSort(plan.steps);
  } catch {
    errors.push('Circular dependency detected in plan');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
