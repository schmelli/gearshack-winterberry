/**
 * Add Gear to Loadout Workflow (Suspend/Resume Pattern)
 * Feature: Human-in-the-Loop Confirmation for Write Operations
 *
 * Implements Mastra's suspend/resume pattern for safe write operations:
 *
 * Step 1: resolveAndValidate — Verify gear item & loadout ownership, check duplicates
 * Step 2: confirmAdd — SUSPEND workflow, wait for user confirmation
 * Step 3: executeAdd — On RESUME, execute the actual database insert (or cancel)
 *
 * This prevents unintended write operations by the AI agent.
 * As the Mastra docs emphasize: "Because they are more powerful than pre-LLM
 * data access patterns, you may need to spend more time ensuring they are
 * permissioned accurately."
 *
 * @see https://mastra.ai/docs/workflows/suspend-and-resume
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { formatWeight } from '../tools/utils';
import {
  suspendForConfirmation,
  type AddGearPayload,
  type ResumeResult,
} from './pending-confirmations';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Workflow input: what the agent provides when calling addToLoadout
 */
const AddGearInputSchema = z.object({
  userId: z.string().uuid(),
  loadoutId: z.string().uuid().optional(),
  currentLoadoutId: z.string().uuid().optional(),
  gearItemId: z.string().uuid(),
  quantity: z.number().int().positive().max(99).default(1),
  worn: z.boolean().default(false),
  consumable: z.boolean().default(false),
});

/**
 * Step 1 output: resolved item and loadout details
 */
const ResolvedDataSchema = z.object({
  valid: z.boolean(),
  gearItemId: z.string(),
  gearItemName: z.string(),
  loadoutId: z.string(),
  loadoutName: z.string(),
  quantity: z.number(),
  worn: z.boolean(),
  consumable: z.boolean(),
  error: z.string().optional(),
});

/**
 * Step 2 output: confirmation suspension result
 */
const ConfirmationSchema = z.object({
  runId: z.string(),
  suspended: z.boolean(),
  message: z.string(),
  gearItemId: z.string(),
  gearItemName: z.string(),
  loadoutId: z.string(),
  loadoutName: z.string(),
});

/**
 * Step 3 output: execution result
 */
const ExecutionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  loadoutItemId: z.string().optional(),
  updatedTotalWeight: z.number().optional(),
  cancelled: z.boolean().optional(),
  error: z.string().optional(),
});

// =============================================================================
// Step 1: Resolve & Validate
// =============================================================================

/**
 * Validates ownership of gear item and loadout, checks for duplicates.
 * This is the same validation logic from the original addToLoadout tool,
 * but separated into its own step.
 */
export const resolveAndValidateStep = createStep({
  id: 'resolveAndValidate',
  inputSchema: AddGearInputSchema,
  outputSchema: ResolvedDataSchema,
  execute: async ({ inputData }) => {
    const { userId, gearItemId, quantity, worn, consumable } = inputData;
    const loadoutId = inputData.loadoutId ?? inputData.currentLoadoutId;

    if (!loadoutId) {
      return {
        valid: false,
        gearItemId,
        gearItemName: '',
        loadoutId: '',
        loadoutName: '',
        quantity,
        worn,
        consumable,
        error: 'No loadout specified. Please provide a loadout ID or navigate to a loadout page.',
      };
    }

    const supabase = createServiceRoleClient();

    // 1. Verify loadout belongs to user
    const { data: loadout, error: loadoutError } = await supabase
      .from('loadouts')
      .select('id, name, user_id')
      .eq('id', loadoutId)
      .single();

    if (loadoutError || !loadout) {
      return {
        valid: false,
        gearItemId,
        gearItemName: '',
        loadoutId: loadoutId ?? '',
        loadoutName: '',
        quantity,
        worn,
        consumable,
        error: 'Loadout not found.',
      };
    }

    if (loadout.user_id !== userId) {
      return {
        valid: false,
        gearItemId,
        gearItemName: '',
        loadoutId,
        loadoutName: loadout.name,
        quantity,
        worn,
        consumable,
        error: 'You can only add items to your own loadouts.',
      };
    }

    // 2. Verify gear item belongs to user
    const { data: gearItem, error: gearError } = await supabase
      .from('gear_items')
      .select('id, name, weight_grams, user_id')
      .eq('id', gearItemId)
      .single();

    if (gearError || !gearItem) {
      return {
        valid: false,
        gearItemId,
        gearItemName: '',
        loadoutId,
        loadoutName: loadout.name,
        quantity,
        worn,
        consumable,
        error: 'Gear item not found.',
      };
    }

    if (gearItem.user_id !== userId) {
      return {
        valid: false,
        gearItemId,
        gearItemName: gearItem.name,
        loadoutId,
        loadoutName: loadout.name,
        quantity,
        worn,
        consumable,
        error: 'You can only add your own gear items to loadouts.',
      };
    }

    // 3. Check for duplicates
    const { data: existing, error: dupError } = await supabase
      .from('loadout_items')
      .select('id')
      .eq('loadout_id', loadoutId)
      .eq('gear_item_id', gearItemId)
      .maybeSingle();

    if (dupError) {
      return {
        valid: false,
        gearItemId,
        gearItemName: gearItem.name,
        loadoutId,
        loadoutName: loadout.name,
        quantity,
        worn,
        consumable,
        error: `Duplicate check failed: ${dupError.message}`,
      };
    }

    if (existing) {
      return {
        valid: false,
        gearItemId,
        gearItemName: gearItem.name,
        loadoutId,
        loadoutName: loadout.name,
        quantity,
        worn,
        consumable,
        error: `"${gearItem.name}" is already in "${loadout.name}". You can update its quantity or settings instead.`,
      };
    }

    return {
      valid: true,
      gearItemId,
      gearItemName: gearItem.name,
      loadoutId,
      loadoutName: loadout.name,
      quantity,
      worn,
      consumable,
    };
  },
});

// =============================================================================
// Step 2: Confirm Add (SUSPEND)
// =============================================================================

/**
 * Suspends the workflow and stores a pending confirmation.
 * The workflow pauses here until the user approves or cancels via the resume API.
 */
export const confirmAddStep = createStep({
  id: 'confirmAdd',
  inputSchema: ResolvedDataSchema,
  outputSchema: ConfirmationSchema,
  execute: async ({ inputData }) => {
    // If validation failed, don't suspend — bail early
    if (!inputData.valid) {
      return {
        runId: '',
        suspended: false,
        message: inputData.error ?? 'Validation failed.',
        gearItemId: inputData.gearItemId,
        gearItemName: inputData.gearItemName,
        loadoutId: inputData.loadoutId,
        loadoutName: inputData.loadoutName,
      };
    }

    // Build confirmation message
    const flags: string[] = [];
    if (inputData.quantity > 1) flags.push(`${inputData.quantity}x`);
    if (inputData.worn) flags.push('worn');
    if (inputData.consumable) flags.push('consumable');
    const flagSuffix = flags.length > 0 ? ` (${flags.join(', ')})` : '';

    const message =
      `Add "${inputData.gearItemName}"${flagSuffix} to "${inputData.loadoutName}"?`;

    // Store the pending confirmation (this is the "suspend" operation)
    const payload: AddGearPayload = {
      gearItemId: inputData.gearItemId,
      gearItemName: inputData.gearItemName,
      loadoutId: inputData.loadoutId,
      loadoutName: inputData.loadoutName,
      quantity: inputData.quantity,
      worn: inputData.worn,
      consumable: inputData.consumable,
    };

    // We extract userId from the workflow input context
    // For now, we pass it through the resolveAndValidate step chain
    // The suspendForConfirmation will use the userId from the chat route
    const confirmation = suspendForConfirmation(
      '', // userId is set by the orchestrator function below
      payload,
      message
    );

    return {
      runId: confirmation.runId,
      suspended: true,
      message,
      gearItemId: inputData.gearItemId,
      gearItemName: inputData.gearItemName,
      loadoutId: inputData.loadoutId,
      loadoutName: inputData.loadoutName,
    };
  },
});

// =============================================================================
// Step 3: Execute Add (RESUME)
// =============================================================================

/**
 * Executes the actual database insert after user confirmation.
 * Called by the resume API when the user approves the action.
 */
export async function executeAddToLoadout(
  payload: AddGearPayload
): Promise<ResumeResult> {
  try {
    const supabase = createServiceRoleClient();

    // Insert into loadout_items
    const { data: inserted, error: insertError } = await supabase
      .from('loadout_items')
      .insert({
        loadout_id: payload.loadoutId,
        gear_item_id: payload.gearItemId,
        quantity: payload.quantity,
        is_worn: payload.worn,
        is_consumable: payload.consumable,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      return {
        success: false,
        message: 'Failed to add item to loadout.',
        error: `Insert failed: ${insertError?.message ?? 'Unknown error'}`,
      };
    }

    // Calculate updated total weight
    type LoadoutItemWithWeight = {
      quantity: number;
      gear_items: { weight_grams: number } | null;
    };

    const { data: allItems } = await supabase
      .from('loadout_items')
      .select('quantity, gear_items(weight_grams)')
      .eq('loadout_id', payload.loadoutId) as { data: LoadoutItemWithWeight[] | null };

    let totalWeight = 0;
    if (allItems) {
      for (const item of allItems) {
        const weight = item.gear_items?.weight_grams ?? 0;
        totalWeight += weight * (item.quantity ?? 1);
      }
    }

    const flags: string[] = [];
    if (payload.quantity > 1) flags.push(`${payload.quantity}x`);
    if (payload.worn) flags.push('worn');
    if (payload.consumable) flags.push('consumable');
    const flagSuffix = flags.length > 0 ? ` (${flags.join(', ')})` : '';

    return {
      success: true,
      message: `Added "${payload.gearItemName}" to "${payload.loadoutName}"${flagSuffix}. Total loadout weight: ${formatWeight(totalWeight)}.`,
      loadoutItemId: inserted.id,
      updatedTotalWeight: totalWeight,
    };
  } catch (error) {
    console.error('[executeAddToLoadout] Error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while adding the item.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Workflow Definition
// =============================================================================

/**
 * The Add Gear Workflow uses Mastra's suspend/resume pattern.
 *
 * Flow:
 * 1. resolveAndValidate → validates ownership, checks duplicates
 * 2. confirmAdd → SUSPENDS workflow, returns pending confirmation to UI
 * 3. executeAdd → RESUMES on user approval, performs database insert
 *
 * The workflow is defined using createWorkflow for type safety,
 * but execution is orchestrated by our addToLoadoutWithConfirmation function
 * and the resume API endpoint.
 */
export const addGearWorkflow = createWorkflow({
  id: 'add-gear-to-loadout',
  inputSchema: AddGearInputSchema,
  outputSchema: ExecutionResultSchema,
})
  .then(resolveAndValidateStep)
  .then(confirmAddStep);

// Commit the workflow to finalize the execution graph
addGearWorkflow.commit();

// =============================================================================
// Orchestrator: Start Workflow (called by addToLoadout tool)
// =============================================================================

/**
 * Start the add-gear workflow with user confirmation.
 *
 * This is the main entry point called by the addToLoadout tool.
 * It runs Step 1 (validate) and Step 2 (suspend) synchronously,
 * then returns the pending confirmation to the agent.
 *
 * @param userId - Authenticated user ID
 * @param loadoutId - Target loadout ID
 * @param gearItemId - Gear item to add
 * @param quantity - Quantity (default 1)
 * @param worn - Worn flag (default false)
 * @param consumable - Consumable flag (default false)
 * @returns Tool result with pending confirmation details or validation error
 */
export async function addToLoadoutWithConfirmation(
  userId: string,
  loadoutId: string | null,
  gearItemId: string,
  quantity: number = 1,
  worn: boolean = false,
  consumable: boolean = false
): Promise<{
  requiresConfirmation: boolean;
  runId?: string;
  message: string;
  gearItemName?: string;
  loadoutName?: string;
  gearItemId?: string;
  loadoutId?: string;
  error?: string;
}> {
  // Run Step 1: Resolve & Validate
  const input = {
    userId,
    loadoutId: loadoutId ?? undefined,
    gearItemId,
    quantity,
    worn,
    consumable,
  };

  // Execute validation directly (same logic as the step).
  // The step never calls suspend(), so the result is always the output type.
  // We cast to strip the InnerOutput union that Mastra adds for suspend-capable steps.
  type ResolvedData = {
    valid: boolean;
    gearItemId: string;
    gearItemName: string;
    loadoutId: string;
    loadoutName: string;
    quantity: number;
    worn: boolean;
    consumable: boolean;
    error?: string;
  };

  const resolvedResult = await resolveAndValidateStep.execute({
    inputData: input,
    // Provide minimal execution context (these aren't used by our step)
    runId: '',
    resourceId: userId,
    workflowId: 'add-gear-to-loadout',
    retryCount: 0,
    state: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as ResolvedData;

  // If validation failed, return error without suspending
  if (!resolvedResult.valid) {
    return {
      requiresConfirmation: false,
      message: resolvedResult.error ?? 'Validation failed.',
      error: resolvedResult.error,
    };
  }

  // Run Step 2: Create pending confirmation (suspend)
  const payload: AddGearPayload = {
    gearItemId: resolvedResult.gearItemId,
    gearItemName: resolvedResult.gearItemName,
    loadoutId: resolvedResult.loadoutId,
    loadoutName: resolvedResult.loadoutName,
    quantity: resolvedResult.quantity,
    worn: resolvedResult.worn,
    consumable: resolvedResult.consumable,
  };

  const flags: string[] = [];
  if (quantity > 1) flags.push(`${quantity}x`);
  if (worn) flags.push('worn');
  if (consumable) flags.push('consumable');
  const flagSuffix = flags.length > 0 ? ` (${flags.join(', ')})` : '';

  const message =
    `Add "${resolvedResult.gearItemName}"${flagSuffix} to "${resolvedResult.loadoutName}"?`;

  const confirmation = suspendForConfirmation(userId, payload, message);

  return {
    requiresConfirmation: true,
    runId: confirmation.runId,
    message,
    gearItemName: resolvedResult.gearItemName,
    loadoutName: resolvedResult.loadoutName,
    gearItemId: resolvedResult.gearItemId,
    loadoutId: resolvedResult.loadoutId,
  };
}
