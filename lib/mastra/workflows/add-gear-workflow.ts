/**
 * Add Gear to Loadout — Async Orchestration Functions
 * Feature: Human-in-the-Loop Confirmation for Write Operations
 *
 * Implements the suspend/resume pattern for safe write operations using
 * plain async functions (no Mastra workflow DSL — see ADR below).
 *
 * Flow:
 *   1. addToLoadoutWithConfirmation() — called by the addToLoadout tool
 *      a. resolveAndValidate()  — verifies ownership, checks duplicates
 *      b. suspendForConfirmation() — stores pending confirmation in Supabase
 *      Returns { requiresConfirmation: true, runId } to the agent
 *
 *   2. User clicks Approve/Cancel in chat UI
 *
 *   3. executeAddToLoadout() — called by POST /api/mastra/workflows/add-gear/resume
 *      a. Re-verifies ownership before write (security hardening)
 *      b. Inserts into loadout_items
 *      Returns updated total weight
 *
 * ADR: Mastra workflow DSL vs. plain functions
 * -------------------------------------------
 * The Mastra `createStep`/`createWorkflow` API is designed for long-running,
 * resumable workflows managed by the Mastra runtime. Our suspend/resume model
 * stores state in Supabase and coordinates via a custom resume API endpoint,
 * so the Mastra workflow graph is unnecessary overhead. Plain async functions
 * are simpler, fully typed without `any` casts, and easier to test.
 *
 * @see https://mastra.ai/docs/workflows/suspend-and-resume
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logInfo, logError } from '@/lib/mastra/logging';
import { formatWeight } from '../tools/utils';
import {
  suspendForConfirmation,
  type AddGearPayload,
  type ResumeResult,
} from './pending-confirmations';

// =============================================================================
// Shared Helpers
// =============================================================================

/**
 * Build a human-readable flag suffix for confirmation messages.
 * e.g. " (2x, worn, consumable)"
 */
function buildFlagSuffix(quantity: number, worn: boolean, consumable: boolean): string {
  const flags: string[] = [];
  if (quantity > 1) flags.push(`${quantity}x`);
  if (worn) flags.push('worn');
  if (consumable) flags.push('consumable');
  return flags.length > 0 ? ` (${flags.join(', ')})` : '';
}

// =============================================================================
// Step 1: Resolve & Validate
// =============================================================================

interface ResolvedData {
  valid: boolean;
  gearItemId: string;
  gearItemName: string;
  loadoutId: string;
  loadoutName: string;
  quantity: number;
  worn: boolean;
  consumable: boolean;
  error?: string;
}

/**
 * Validates ownership of gear item and loadout, checks for duplicates.
 *
 * @param userId - Authenticated user ID
 * @param loadoutId - Target loadout ID
 * @param gearItemId - Gear item to add
 * @param quantity - Quantity (default 1)
 * @param worn - Worn flag
 * @param consumable - Consumable flag
 */
async function resolveAndValidate(
  userId: string,
  loadoutId: string,
  gearItemId: string,
  quantity: number,
  worn: boolean,
  consumable: boolean
): Promise<ResolvedData> {
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
      loadoutId,
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
}

// =============================================================================
// Step 3: Execute Add (RESUME)
// =============================================================================

/**
 * Executes the actual database insert after user confirmation.
 * Called by the resume API when the user approves the action.
 *
 * Re-verifies ownership before writing to ensure the gear item and loadout
 * still belong to the user even if the DB state changed during the 5-minute
 * confirmation window.
 *
 * @param payload - The payload stored at suspension time
 * @param userId - The authenticated user (for ownership re-verification)
 */
export async function executeAddToLoadout(
  payload: AddGearPayload,
  userId: string
): Promise<ResumeResult> {
  try {
    const supabase = createServiceRoleClient();

    // Re-verify ownership before write (security hardening).
    // The 5-minute TTL limits the window, but a cheap guard query makes
    // the security invariants watertight regardless of TTL.
    const [{ data: loadout, error: loadoutErr }, { data: gearItem, error: gearErr }] =
      await Promise.all([
        supabase
          .from('loadouts')
          .select('user_id')
          .eq('id', payload.loadoutId)
          .single(),
        supabase
          .from('gear_items')
          .select('user_id')
          .eq('id', payload.gearItemId)
          .single(),
      ]);

    if (loadoutErr || !loadout || loadout.user_id !== userId) {
      return {
        success: false,
        message: 'Loadout not found or no longer accessible.',
        error: 'Ownership re-verification failed for loadout.',
      };
    }

    if (gearErr || !gearItem || gearItem.user_id !== userId) {
      return {
        success: false,
        message: 'Gear item not found or no longer accessible.',
        error: 'Ownership re-verification failed for gear item.',
      };
    }

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
      // Provide specific error for the most common race condition: duplicate item
      const isDuplicate =
        insertError?.message?.toLowerCase().includes('unique') ||
        insertError?.message?.toLowerCase().includes('duplicate') ||
        insertError?.code === '23505';

      if (isDuplicate) {
        return {
          success: false,
          message: `"${payload.gearItemName}" was already added to "${payload.loadoutName}" by another action.`,
          error: 'Duplicate item: unique constraint violation.',
        };
      }

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

    const flagSuffix = buildFlagSuffix(payload.quantity, payload.worn, payload.consumable);

    return {
      success: true,
      message: `Added "${payload.gearItemName}" to "${payload.loadoutName}"${flagSuffix}. Total loadout weight: ${formatWeight(totalWeight)}.`,
      loadoutItemId: inserted.id,
      updatedTotalWeight: totalWeight,
    };
  } catch (error) {
    logError('[executeAddToLoadout] Unexpected error', error);
    return {
      success: false,
      message: 'An unexpected error occurred while adding the item.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Orchestrator: Start Workflow (called by addToLoadout tool)
// =============================================================================

/**
 * Start the add-gear workflow with user confirmation.
 *
 * This is the main entry point called by the addToLoadout tool.
 * It runs validation and creates a pending confirmation in Supabase,
 * then returns the pending confirmation details to the agent.
 *
 * @param userId - Authenticated user ID
 * @param loadoutId - Target loadout ID (null if not provided)
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
  if (!loadoutId) {
    return {
      requiresConfirmation: false,
      message: 'No loadout specified. Please provide a loadout ID or navigate to a loadout page.',
      error: 'No loadout specified.',
    };
  }

  // Step 1: Resolve & Validate
  const resolved = await resolveAndValidate(
    userId,
    loadoutId,
    gearItemId,
    quantity,
    worn,
    consumable
  );

  if (!resolved.valid) {
    return {
      requiresConfirmation: false,
      message: resolved.error ?? 'Validation failed.',
      error: resolved.error,
    };
  }

  // Step 2: Create pending confirmation (suspend)
  const payload: AddGearPayload = {
    gearItemId: resolved.gearItemId,
    gearItemName: resolved.gearItemName,
    loadoutId: resolved.loadoutId,
    loadoutName: resolved.loadoutName,
    quantity: resolved.quantity,
    worn: resolved.worn,
    consumable: resolved.consumable,
  };

  const flagSuffix = buildFlagSuffix(quantity, worn, consumable);
  const message = `Add "${resolved.gearItemName}"${flagSuffix} to "${resolved.loadoutName}"?`;

  const confirmation = await suspendForConfirmation(userId, payload, message);

  logInfo('[AddGearOrchestrator] Suspended for confirmation', {
    metadata: {
      runId: confirmation.runId,
      item: resolved.gearItemName,
      loadout: resolved.loadoutName,
    },
  });

  return {
    requiresConfirmation: true,
    runId: confirmation.runId,
    message,
    gearItemName: resolved.gearItemName,
    loadoutName: resolved.loadoutName,
    gearItemId: resolved.gearItemId,
    loadoutId: resolved.loadoutId,
  };
}
