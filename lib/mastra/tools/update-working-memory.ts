/**
 * Update Working Memory Tool
 *
 * Allows the Mastra agent to persist what it learns about a user
 * during a conversation. Without this tool, the agent could only read
 * the working memory profile — never write to it.
 *
 * Security:
 * - userId is taken from requestContext (set by the authenticated chat route)
 * - Uses service role client — writes are scoped to the authenticated user
 * - All updates are merged with the existing profile (no full-overwrite risk)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getWorkingMemory, saveWorkingMemoryDirect } from '@/lib/mastra/memory/working-memory-adapter';
import type { GearshackUserProfile } from '@/lib/mastra/schemas/working-memory';

// =============================================================================
// Input Schema
// =============================================================================

const updateWorkingMemoryInputSchema = z.object({
  operation: z
    .enum([
      'set_identity',
      'set_preference',
      'set_activity',
      'add_brand_favorite',
      'add_brand_avoid',
      'add_brand_curious',
      'add_fact',
      'add_trip',
      'add_gear_goal',
    ])
    .describe(
      'Type of update to apply to the user profile. ' +
      'set_identity: name/location/language. ' +
      'set_preference: weight philosophy, budget, quality vs weight. ' +
      'set_activity: primary activities, experience level, trip length. ' +
      'add_brand_*: add a brand to favorites/avoid/curious list. ' +
      'add_fact: store a specific learned fact with confidence level. ' +
      'add_trip: add an upcoming trip the user mentioned. ' +
      'add_gear_goal: store a gear-related goal.'
    ),

  // Identity fields
  name: z.string().optional().describe('User name (for set_identity)'),
  location: z.string().optional().describe('User location/region (for set_identity)'),
  preferredLanguage: z.enum(['en', 'de']).optional().describe('Preferred language (for set_identity)'),

  // Preference fields
  weightPhilosophy: z
    .enum(['ultralight', 'lightweight', 'comfort'])
    .optional()
    .describe('Weight philosophy (for set_preference)'),
  budgetRange: z
    .enum(['budget', 'mid-range', 'premium', 'mixed'])
    .optional()
    .describe('Budget range (for set_preference)'),
  qualityVsWeight: z
    .enum(['weight-priority', 'balanced', 'durability-priority'])
    .optional()
    .describe('Quality vs weight priority (for set_preference)'),

  // Activity fields
  activity: z.string().optional().describe('Activity name, e.g. "hiking", "climbing" (for set_activity, add_trip)'),
  experience: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'])
    .optional()
    .describe('Experience level (for set_activity)'),
  typicalTripLength: z
    .enum(['day-trips', 'weekends', 'week-long', 'thru-hikes', 'mixed'])
    .optional()
    .describe('Typical trip length (for set_activity)'),

  // Brand field
  brand: z.string().optional().describe('Brand name (for add_brand_*)'),

  // Fact fields
  fact: z.string().optional().describe('The fact to store (for add_fact)'),
  factCategory: z
    .enum(['preference', 'constraint', 'history', 'other'])
    .optional()
    .describe('Category of the fact (for add_fact)'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .optional()
    .default('high')
    .describe('Confidence level for the fact (for add_fact)'),

  // Trip fields
  tripDestination: z.string().optional().describe('Trip destination (for add_trip)'),
  tripDate: z.string().optional().describe('Approximate date or date range (for add_trip)'),

  // Gear goal
  gearGoal: z.string().optional().describe('Gear goal description (for add_gear_goal)'),
});

// =============================================================================
// Output Schema
// =============================================================================

const updateWorkingMemoryOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  message: z.string(),
});

// =============================================================================
// Tool Implementation
// =============================================================================

export const updateWorkingMemoryTool = createTool({
  id: 'persistUserProfile',
  description:
    'Persist what you learn about the user during this conversation. ' +
    'Call this whenever the user explicitly states a preference, goal, fact about themselves, ' +
    'planned trip, or brand opinion. Do NOT call for assumptions — only for explicit statements. ' +
    'Example triggers: "I prefer ultralight gear", "I\'m planning a PCT hike", "I hate Osprey".',
  inputSchema: updateWorkingMemoryInputSchema,
  outputSchema: updateWorkingMemoryOutputSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (input, executionContext: any) => {
    const requestContext = executionContext?.requestContext as Map<string, unknown> | undefined;
    const userId = requestContext?.get('userId') as string | undefined;

    if (!userId) {
      return {
        success: false,
        operation: input.operation,
        message: 'Cannot update working memory: userId not available in request context.',
      };
    }

    try {
      const supabase = createServiceRoleClient();
      const profile = await getWorkingMemory(supabase, userId);
      const updated = applyUpdate(profile, input);
      const saved = await saveWorkingMemoryDirect(supabase, userId, updated);

      if (!saved) {
        return {
          success: false,
          operation: input.operation,
          message: 'Profile update failed to persist. Will retry next conversation.',
        };
      }

      return {
        success: true,
        operation: input.operation,
        message: buildConfirmationMessage(input),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[updateWorkingMemory] Error:', msg);
      return {
        success: false,
        operation: input.operation,
        message: `Update failed: ${msg}`,
      };
    }
  },
});

// =============================================================================
// Helpers
// =============================================================================

function applyUpdate(
  profile: GearshackUserProfile,
  ctx: z.infer<typeof updateWorkingMemoryInputSchema>
): GearshackUserProfile {
  const now = new Date().toISOString();

  switch (ctx.operation) {
    case 'set_identity':
      return {
        ...profile,
        ...(ctx.name !== undefined && { name: ctx.name }),
        ...(ctx.location !== undefined && { location: ctx.location }),
        ...(ctx.preferredLanguage !== undefined && { preferredLanguage: ctx.preferredLanguage }),
      };

    case 'set_preference':
      return {
        ...profile,
        preferences: {
          ...profile.preferences,
          ...(ctx.weightPhilosophy !== undefined && { weightPhilosophy: ctx.weightPhilosophy }),
          ...(ctx.budgetRange !== undefined && { budgetRange: ctx.budgetRange }),
          ...(ctx.qualityVsWeight !== undefined && { qualityVsWeight: ctx.qualityVsWeight }),
        },
      };

    case 'set_activity':
      return {
        ...profile,
        activities: {
          ...profile.activities,
          ...(ctx.activity !== undefined && {
            primary: Array.from(new Set([...profile.activities.primary, ctx.activity])),
          }),
          ...(ctx.experience !== undefined && { experience: ctx.experience }),
          ...(ctx.typicalTripLength !== undefined && { typicalTripLength: ctx.typicalTripLength }),
        },
      };

    case 'add_brand_favorite':
      if (!ctx.brand) return profile;
      return {
        ...profile,
        brands: {
          ...profile.brands,
          favorites: Array.from(new Set([...profile.brands.favorites, ctx.brand])),
          // Remove from avoid if it was there before
          avoid: profile.brands.avoid.filter((b) => b !== ctx.brand),
        },
      };

    case 'add_brand_avoid':
      if (!ctx.brand) return profile;
      return {
        ...profile,
        brands: {
          ...profile.brands,
          avoid: Array.from(new Set([...profile.brands.avoid, ctx.brand])),
          // Remove from favorites if it was there before
          favorites: profile.brands.favorites.filter((b) => b !== ctx.brand),
        },
      };

    case 'add_brand_curious':
      if (!ctx.brand) return profile;
      return {
        ...profile,
        brands: {
          ...profile.brands,
          curious: Array.from(new Set([...profile.brands.curious, ctx.brand])),
        },
      };

    case 'add_fact':
      if (!ctx.fact) return profile;
      return {
        ...profile,
        facts: [
          ...profile.facts,
          {
            fact: ctx.fact,
            category: ctx.factCategory ?? 'other',
            confidence: ctx.confidence ?? 'high',
            learnedAt: now,
          },
        ],
      };

    case 'add_trip':
      if (!ctx.tripDestination || !ctx.activity) return profile;
      return {
        ...profile,
        goals: {
          ...profile.goals,
          upcomingTrips: [
            ...profile.goals.upcomingTrips,
            {
              destination: ctx.tripDestination,
              activity: ctx.activity,
              ...(ctx.tripDate !== undefined && { date: ctx.tripDate }),
              addedAt: now,
            },
          ],
        },
      };

    case 'add_gear_goal':
      if (!ctx.gearGoal) return profile;
      return {
        ...profile,
        goals: {
          ...profile.goals,
          gearGoals: Array.from(new Set([...profile.goals.gearGoals, ctx.gearGoal])),
        },
      };

    default:
      return profile;
  }
}

function buildConfirmationMessage(ctx: z.infer<typeof updateWorkingMemoryInputSchema>): string {
  switch (ctx.operation) {
    case 'set_identity':
      return `Noted: ${[ctx.name && `name "${ctx.name}"`, ctx.location && `location "${ctx.location}"`].filter(Boolean).join(', ')}.`;
    case 'set_preference':
      return `Noted: ${[ctx.weightPhilosophy && `weight preference "${ctx.weightPhilosophy}"`, ctx.budgetRange && `budget "${ctx.budgetRange}"`].filter(Boolean).join(', ')}.`;
    case 'set_activity':
      return `Noted: ${[ctx.activity && `activity "${ctx.activity}"`, ctx.experience && `experience "${ctx.experience}"`].filter(Boolean).join(', ')}.`;
    case 'add_brand_favorite':
      return `Noted: "${ctx.brand}" added to favorite brands.`;
    case 'add_brand_avoid':
      return `Noted: "${ctx.brand}" added to brands to avoid.`;
    case 'add_brand_curious':
      return `Noted: "${ctx.brand}" added to brands of interest.`;
    case 'add_fact':
      return `Noted: "${ctx.fact}"`;
    case 'add_trip':
      return `Noted: upcoming trip to ${ctx.tripDestination} (${ctx.activity}${ctx.tripDate ? `, ${ctx.tripDate}` : ''}).`;
    case 'add_gear_goal':
      return `Noted: gear goal "${ctx.gearGoal}".`;
    default:
      return 'Profile updated.';
  }
}
