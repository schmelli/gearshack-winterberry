/**
 * GearShack User Profile Schema (Working Memory)
 * Feature: 002-mastra-memory-system
 *
 * This Zod schema defines the structured profile that the AI agent
 * maintains about each user. The agent can READ this at conversation
 * start and UPDATE it during conversations when it learns new information.
 *
 * Resource-scoped: persists across all conversation threads for the same user.
 */

import { z } from 'zod';

// =============================================================================
// Schema Definition
// =============================================================================

/**
 * Learned fact with metadata for confidence tracking
 */
const LearnedFactSchema = z.object({
  fact: z.string().describe('The learned fact'),
  category: z
    .enum(['preference', 'constraint', 'history', 'other'])
    .describe('Classification of the fact'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe('How confident the agent is about this fact'),
  learnedAt: z.string().describe('ISO timestamp when fact was learned'),
});

/**
 * Cached GearGraph insight to avoid redundant queries
 */
const CachedInsightSchema = z.object({
  productName: z.string(),
  brand: z.string().optional(),
  insight: z.string(),
  insightType: z
    .enum(['alternative', 'compatibility', 'review-summary', 'durability', 'other'])
    .describe('Type of insight cached'),
  retrievedAt: z.string().describe('ISO timestamp when insight was fetched'),
});

/**
 * Upcoming trip entry
 */
const UpcomingTripSchema = z.object({
  destination: z.string(),
  date: z.string().optional().describe('Approximate date or range'),
  activity: z.string(),
  addedAt: z.string().describe('ISO timestamp when trip was mentioned'),
});

/**
 * GearShack User Profile Schema
 *
 * The AI agent reads this at the start of each conversation and
 * updates it when it learns new information from the user.
 */
export const GearshackUserProfileSchema = z.object({
  // === IDENTITY ===
  name: z.string().optional().describe("User's preferred name"),
  location: z.string().optional().describe("User's region or country"),
  preferredLanguage: z
    .enum(['en', 'de'])
    .optional()
    .describe("User's preferred language"),

  // === GEAR PHILOSOPHY ===
  preferences: z
    .object({
      weightPhilosophy: z
        .enum(['ultralight', 'lightweight', 'comfort', 'unknown'])
        .default('unknown')
        .describe("User's approach to gear weight"),
      budgetRange: z
        .enum(['budget', 'mid-range', 'premium', 'mixed', 'unknown'])
        .default('unknown')
        .describe('Typical spending range'),
      qualityVsWeight: z
        .enum(['weight-priority', 'balanced', 'durability-priority', 'unknown'])
        .default('unknown')
        .describe('Trade-off preference between weight and durability'),
    })
    .default({
      weightPhilosophy: 'unknown',
      budgetRange: 'unknown',
      qualityVsWeight: 'unknown',
    }),

  // === ACTIVITIES & EXPERIENCE ===
  activities: z
    .object({
      primary: z
        .array(z.string())
        .default([])
        .describe('Main outdoor activities (hiking, backpacking, climbing, etc.)'),
      experience: z
        .enum(['beginner', 'intermediate', 'advanced', 'expert', 'unknown'])
        .default('unknown')
        .describe('Overall outdoor experience level'),
      typicalTripLength: z
        .enum(['day-trips', 'weekends', 'week-long', 'thru-hikes', 'mixed', 'unknown'])
        .default('unknown')
        .describe('Typical trip duration'),
    })
    .default({
      primary: [],
      experience: 'unknown',
      typicalTripLength: 'unknown',
    }),

  // === BRAND PREFERENCES ===
  brands: z
    .object({
      favorites: z
        .array(z.string())
        .default([])
        .describe('Brands user has expressed preference for'),
      avoid: z
        .array(z.string())
        .default([])
        .describe('Brands user wants to avoid'),
      curious: z
        .array(z.string())
        .default([])
        .describe('Brands user has asked about but not committed to'),
    })
    .default({
      favorites: [],
      avoid: [],
      curious: [],
    }),

  // === GOALS & PLANS ===
  goals: z
    .object({
      upcomingTrips: z
        .array(UpcomingTripSchema)
        .default([])
        .describe('Trips the user has mentioned planning'),
      gearGoals: z
        .array(z.string())
        .default([])
        .describe("Specific gear goals (e.g., 'reduce base weight to 10lbs')"),
      wishlistPriorities: z
        .array(z.string())
        .default([])
        .describe('Items user has prioritized from wishlist'),
    })
    .default({
      upcomingTrips: [],
      gearGoals: [],
      wishlistPriorities: [],
    }),

  // === LEARNED FACTS ===
  facts: z
    .array(LearnedFactSchema)
    .default([])
    .describe('Specific facts learned from conversations'),

  // === GEARGRAPH CACHE ===
  cachedInsights: z
    .array(CachedInsightSchema)
    .default([])
    .describe('Cached product insights from GearGraph (TTL: 30 days)'),

  // === METADATA ===
  lastInteraction: z
    .string()
    .optional()
    .describe('ISO timestamp of last conversation'),
  conversationCount: z
    .number()
    .default(0)
    .describe('Total conversations with the agent'),
});

// =============================================================================
// Type Exports
// =============================================================================

export type GearshackUserProfile = z.infer<typeof GearshackUserProfileSchema>;
export type LearnedFact = z.infer<typeof LearnedFactSchema>;
export type CachedInsight = z.infer<typeof CachedInsightSchema>;
export type UpcomingTrip = z.infer<typeof UpcomingTripSchema>;

// =============================================================================
// Defaults & Utilities
// =============================================================================

/**
 * Default empty profile for new users
 */
export const DEFAULT_USER_PROFILE: GearshackUserProfile = {
  preferences: {
    weightPhilosophy: 'unknown',
    budgetRange: 'unknown',
    qualityVsWeight: 'unknown',
  },
  activities: {
    primary: [],
    experience: 'unknown',
    typicalTripLength: 'unknown',
  },
  brands: {
    favorites: [],
    avoid: [],
    curious: [],
  },
  goals: {
    upcomingTrips: [],
    gearGoals: [],
    wishlistPriorities: [],
  },
  facts: [],
  cachedInsights: [],
  conversationCount: 0,
};

/**
 * Maximum number of facts to store (prevents unbounded growth)
 */
export const MAX_FACTS = 50;

/**
 * Maximum number of cached insights (30-day TTL applied separately)
 */
export const MAX_CACHED_INSIGHTS = 30;

/**
 * TTL for cached GearGraph insights in days
 */
export const CACHED_INSIGHT_TTL_DAYS = 30;

/**
 * Clean expired cached insights from profile
 */
export function cleanExpiredInsights(
  profile: GearshackUserProfile
): GearshackUserProfile {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CACHED_INSIGHT_TTL_DAYS);
  const cutoffIso = cutoff.toISOString();

  return {
    ...profile,
    cachedInsights: profile.cachedInsights.filter(
      (insight) => insight.retrievedAt > cutoffIso
    ),
  };
}
