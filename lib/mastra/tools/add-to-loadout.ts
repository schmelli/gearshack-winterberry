/**
 * Add to Loadout Tool (with Suspend/Resume Confirmation)
 * Feature: AI Gear Assistant - addToLoadout
 *
 * Allows the AI agent to request adding gear items to a user's loadout.
 * Instead of executing the write operation immediately, this tool:
 * 1. Validates ownership and checks for duplicates
 * 2. Returns a "requires_confirmation" response with a runId
 * 3. The chat stream emits a confirm_action SSE event
 * 4. The user approves/cancels via the UI
 * 5. The resume API executes the actual database write
 *
 * This implements the suspend/resume pattern from Mastra for human-in-the-loop
 * safety on write operations.
 *
 * Security:
 * - Verifies loadout belongs to the authenticated user
 * - Verifies gear item belongs to the authenticated user
 * - Prevents duplicate items in the same loadout
 * - Requires explicit user confirmation before any write
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { extractUserId, extractCurrentLoadoutId } from './utils';
import { logError } from '@/lib/mastra/logging';
import { addToLoadoutWithConfirmation } from '../workflows/add-gear-workflow';

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
  requiresConfirmation: z.boolean().optional(),
  runId: z.string().optional(),
  gearItemName: z.string().optional(),
  loadoutName: z.string().optional(),
  gearItemId: z.string().optional(),
  loadoutId: z.string().optional(),
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
Prevents duplicates — if the item is already in the loadout, returns an error with guidance.

IMPORTANT: This tool does NOT execute the add immediately. It validates the request
and returns a confirmation prompt. The user must approve before the item is actually added.
When you receive a response with requiresConfirmation=true, tell the user you've
sent them a confirmation card and they need to approve it.`,

  inputSchema: addToLoadoutInputSchema,
  outputSchema: addToLoadoutOutputSchema,

  execute: async (input, executionContext) => {
    const { gearItemId, worn, quantity, consumable } = input;

    // Get userId from request context
    const userId = extractUserId(executionContext);

    if (!userId) {
      return {
        success: false,
        message: 'User ID not available.',
        error: 'User ID not provided in request context.',
      };
    }

    // Resolve loadoutId: use input or fall back to currentLoadoutId from context
    const loadoutId = input.loadoutId ?? extractCurrentLoadoutId(executionContext);

    if (!loadoutId) {
      return {
        success: false,
        message: 'No loadout specified. Please provide a loadout ID or navigate to a loadout page.',
        error: 'No loadoutId provided and no currentLoadoutId in context.',
      };
    }

    try {
      // Start the add-gear workflow with confirmation
      const result = await addToLoadoutWithConfirmation(
        userId,
        loadoutId,
        gearItemId,
        quantity,
        worn,
        consumable
      );

      if (result.requiresConfirmation) {
        return {
          success: true,
          requiresConfirmation: true,
          runId: result.runId,
          message: result.message,
          gearItemName: result.gearItemName,
          loadoutName: result.loadoutName,
          gearItemId: result.gearItemId,
          loadoutId: result.loadoutId,
        };
      }

      // Validation failed — return the error
      return {
        success: false,
        message: result.message,
        error: result.error,
      };
    } catch (error) {
      logError('[addToLoadout] Unexpected error', error);
      return {
        success: false,
        message: 'An unexpected error occurred while processing the request.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
