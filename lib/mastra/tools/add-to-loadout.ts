/**
 * Add to Loadout Tool
 * Feature: AI Gear Assistant - addToLoadout
 *
 * Allows the AI agent to add gear items to a user's loadout.
 *
 * Security:
 * - Verifies loadout belongs to the authenticated user
 * - Verifies gear item belongs to the authenticated user
 * - Prevents duplicate items in the same loadout
 * - Uses service role client with manual user_id filtering
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';

// =============================================================================
// Input Schema
// =============================================================================

const addToLoadoutInputSchema = z.object({
  loadoutId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'UUID of the loadout to add the item to. If omitted, uses the current loadout from context.'
    ),

  gearItemId: z
    .string()
    .uuid()
    .describe('UUID of the gear item to add to the loadout.'),

  worn: z
    .boolean()
    .default(false)
    .describe('Whether this item is worn (not carried in pack). Defaults to false.'),

  quantity: z
    .number()
    .int()
    .positive()
    .max(99)
    .default(1)
    .describe('Quantity of this item. Defaults to 1.'),

  consumable: z
    .boolean()
    .default(false)
    .describe('Whether this item is consumable (food, fuel, etc.). Defaults to false.'),
});

// =============================================================================
// Output Schema
// =============================================================================

const addToLoadoutOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  loadoutItemId: z.string().optional(),
  updatedTotalWeight: z.number().optional(),
  error: z.string().optional(),
});

// =============================================================================
// Tool Definition
// =============================================================================

export const addToLoadoutTool = createTool({
  id: 'addToLoadout',

  description: `Add a gear item to a user's loadout.

Use this when the user asks to add gear to a loadout, e.g.:
- "Add my tent to this loadout"
- "Put the Osprey pack in my summer trip loadout"
- "Add 2 fuel canisters as consumables"

Requires gearItemId. If loadoutId is omitted, uses the current loadout from context.
Prevents duplicates — if the item is already in the loadout, returns an error with guidance.`,

  inputSchema: addToLoadoutInputSchema,
  outputSchema: addToLoadoutOutputSchema,

  execute: async (input, executionContext) => {
    const { gearItemId, worn, quantity, consumable } = input;

    // Get userId from request context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestContext = (executionContext as any)?.requestContext as Map<string, unknown> | undefined;
    const userId = requestContext?.get('userId') as string | undefined;

    if (!userId) {
      return {
        success: false,
        message: 'User ID not available.',
        error: 'User ID not provided in request context.',
      };
    }

    // Resolve loadoutId: use input or fall back to currentLoadoutId from context
    const loadoutId = input.loadoutId || (requestContext?.get('currentLoadoutId') as string | undefined);

    if (!loadoutId) {
      return {
        success: false,
        message: 'No loadout specified. Please provide a loadout ID or navigate to a loadout page.',
        error: 'No loadoutId provided and no currentLoadoutId in context.',
      };
    }

    try {
      const supabase = createServiceRoleClient();

      // 1. Verify loadout belongs to user
      const { data: loadout, error: loadoutError } = await supabase
        .from('loadouts')
        .select('id, name, user_id')
        .eq('id', loadoutId)
        .single();

      if (loadoutError || !loadout) {
        return {
          success: false,
          message: 'Loadout not found.',
          error: `Loadout ${loadoutId} not found.`,
        };
      }

      if (loadout.user_id !== userId) {
        return {
          success: false,
          message: 'You can only add items to your own loadouts.',
          error: 'Loadout does not belong to the authenticated user.',
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
          success: false,
          message: 'Gear item not found.',
          error: `Gear item ${gearItemId} not found.`,
        };
      }

      if (gearItem.user_id !== userId) {
        return {
          success: false,
          message: 'You can only add your own gear items to loadouts.',
          error: 'Gear item does not belong to the authenticated user.',
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
          success: false,
          message: 'Failed to check for duplicates.',
          error: `Duplicate check failed: ${dupError.message}`,
        };
      }

      if (existing) {
        return {
          success: false,
          message: `"${gearItem.name}" is already in "${loadout.name}". You can update its quantity or settings instead.`,
          error: 'Duplicate item in loadout.',
        };
      }

      // 4. Insert into loadout_items
      const { data: inserted, error: insertError } = await supabase
        .from('loadout_items')
        .insert({
          loadout_id: loadoutId,
          gear_item_id: gearItemId,
          quantity: quantity,
          is_worn: worn,
          is_consumable: consumable,
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

      // 5. Calculate updated total weight (computed, not stored on loadouts table)
      const { data: allItems } = await supabase
        .from('loadout_items')
        .select('quantity, gear_items(weight_grams)')
        .eq('loadout_id', loadoutId);

      let totalWeight = 0;
      if (allItems) {
        for (const item of allItems) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const weight = (item as any).gear_items?.weight_grams ?? 0;
          totalWeight += weight * (item.quantity ?? 1);
        }
      }

      return {
        success: true,
        message: `Added "${gearItem.name}" to "${loadout.name}" (${quantity}x${worn ? ', worn' : ''}${consumable ? ', consumable' : ''}). Total loadout weight: ${(totalWeight / 1000).toFixed(2)} kg.`,
        loadoutItemId: inserted.id,
        updatedTotalWeight: totalWeight,
      };
    } catch (error) {
      console.error('[addToLoadout] Error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while adding the item.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
