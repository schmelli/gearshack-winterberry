/**
 * Working Memory Adapter for Supabase
 * Feature: 002-mastra-memory-system
 *
 * Manages the user_working_memory table which stores the AI agent's
 * structured knowledge about each user (preferences, goals, facts, etc.)
 *
 * Resource-scoped: One profile per user, shared across all conversations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  GearshackUserProfileSchema,
  DEFAULT_USER_PROFILE,
  MAX_FACTS,
  MAX_CACHED_INSIGHTS,
  cleanExpiredInsights,
  type GearshackUserProfile,
} from '../schemas/working-memory';

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the working memory profile for a user
 *
 * Returns the validated profile or creates a default one if none exists.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns User profile (validated against Zod schema)
 */
export async function getWorkingMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<GearshackUserProfile> {
  try {
    const { data, error } = await supabase
      .from('user_working_memory')
      .select('profile')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - new user, return defaults
        return { ...DEFAULT_USER_PROFILE };
      }
      console.error('[Working Memory] Failed to fetch profile:', error.message);
      return { ...DEFAULT_USER_PROFILE };
    }

    // Validate profile against schema (safe parse for graceful handling)
    const result = GearshackUserProfileSchema.safeParse(data.profile);
    if (!result.success) {
      console.warn(
        '[Working Memory] Profile validation failed, using defaults:',
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      );
      return { ...DEFAULT_USER_PROFILE };
    }

    // Clean expired cached insights
    return cleanExpiredInsights(result.data);
  } catch (error) {
    console.error(
      '[Working Memory] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { ...DEFAULT_USER_PROFILE };
  }
}

/**
 * Save/update the working memory profile for a user
 *
 * Uses upsert to create or update the profile.
 * Enforces limits on facts and cached insights.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @param profile - Updated profile
 */
export async function saveWorkingMemory(
  supabase: SupabaseClient,
  userId: string,
  profile: GearshackUserProfile
): Promise<void> {
  try {
    // Enforce size limits
    const trimmedProfile: GearshackUserProfile = {
      ...profile,
      // Keep only most recent facts up to MAX_FACTS
      facts: profile.facts.slice(-MAX_FACTS),
      // Keep only most recent cached insights up to MAX_CACHED_INSIGHTS
      cachedInsights: cleanExpiredInsights(profile).cachedInsights.slice(
        -MAX_CACHED_INSIGHTS
      ),
      // Update metadata
      lastInteraction: new Date().toISOString(),
      conversationCount: (profile.conversationCount || 0) + 1,
    };

    // Validate before saving
    const result = GearshackUserProfileSchema.safeParse(trimmedProfile);
    if (!result.success) {
      console.error(
        '[Working Memory] Profile validation failed on save:',
        result.error.issues
      );
      return;
    }

    const { error } = await supabase.from('user_working_memory').upsert(
      {
        user_id: userId,
        profile: result.data,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      console.error('[Working Memory] Failed to save profile:', error.message);
    } else {
      console.log(`[Working Memory] Profile saved for user ${userId}`);
    }
  } catch (error) {
    console.error(
      '[Working Memory] Unexpected error on save:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Delete working memory for a user (GDPR Right to Erasure)
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 */
export async function deleteWorkingMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_working_memory')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error(
      '[Working Memory] Failed to delete profile:',
      error.message
    );
    throw error;
  }

  console.log(`[Working Memory] Profile deleted for user ${userId}`);
}

/**
 * Format working memory for inclusion in system prompt
 *
 * @param profile - User profile
 * @param locale - User locale ('en' | 'de')
 * @returns Formatted string for system prompt
 */
export function formatWorkingMemoryForPrompt(
  profile: GearshackUserProfile,
  locale: string = 'en'
): string {
  const isGerman = locale === 'de';
  const sections: string[] = [];

  const header = isGerman
    ? '**Dein Wissen ueber diesen Nutzer (Arbeitsspeicher):**'
    : '**Your knowledge about this user (Working Memory):**';
  sections.push(header);

  // Identity
  if (profile.name || profile.location) {
    const parts: string[] = [];
    if (profile.name) parts.push(isGerman ? `Name: ${profile.name}` : `Name: ${profile.name}`);
    if (profile.location) parts.push(isGerman ? `Standort: ${profile.location}` : `Location: ${profile.location}`);
    sections.push(parts.join(', '));
  }

  // Preferences
  const prefs = profile.preferences;
  if (prefs.weightPhilosophy !== 'unknown' || prefs.budgetRange !== 'unknown') {
    const prefParts: string[] = [];
    if (prefs.weightPhilosophy !== 'unknown') {
      prefParts.push(
        isGerman
          ? `Gewichtsphilosophie: ${prefs.weightPhilosophy}`
          : `Weight philosophy: ${prefs.weightPhilosophy}`
      );
    }
    if (prefs.budgetRange !== 'unknown') {
      prefParts.push(
        isGerman
          ? `Budget: ${prefs.budgetRange}`
          : `Budget: ${prefs.budgetRange}`
      );
    }
    if (prefs.qualityVsWeight !== 'unknown') {
      prefParts.push(
        isGerman
          ? `Qualitaet vs Gewicht: ${prefs.qualityVsWeight}`
          : `Quality vs weight: ${prefs.qualityVsWeight}`
      );
    }
    sections.push(prefParts.join(', '));
  }

  // Activities
  const acts = profile.activities;
  if (acts.primary.length > 0 || acts.experience !== 'unknown') {
    const actParts: string[] = [];
    if (acts.primary.length > 0) {
      actParts.push(
        isGerman
          ? `Aktivitaeten: ${acts.primary.join(', ')}`
          : `Activities: ${acts.primary.join(', ')}`
      );
    }
    if (acts.experience !== 'unknown') {
      actParts.push(
        isGerman
          ? `Erfahrung: ${acts.experience}`
          : `Experience: ${acts.experience}`
      );
    }
    if (acts.typicalTripLength !== 'unknown') {
      actParts.push(
        isGerman
          ? `Typische Touren: ${acts.typicalTripLength}`
          : `Typical trips: ${acts.typicalTripLength}`
      );
    }
    sections.push(actParts.join(', '));
  }

  // Brand preferences
  const brands = profile.brands;
  if (brands.favorites.length > 0 || brands.avoid.length > 0) {
    const brandParts: string[] = [];
    if (brands.favorites.length > 0) {
      brandParts.push(
        isGerman
          ? `Lieblingsmarken: ${brands.favorites.join(', ')}`
          : `Favorite brands: ${brands.favorites.join(', ')}`
      );
    }
    if (brands.avoid.length > 0) {
      brandParts.push(
        isGerman
          ? `Vermeiden: ${brands.avoid.join(', ')}`
          : `Avoid: ${brands.avoid.join(', ')}`
      );
    }
    sections.push(brandParts.join('. '));
  }

  // Goals
  const goals = profile.goals;
  if (goals.upcomingTrips.length > 0) {
    const trips = goals.upcomingTrips
      .map((t) => `${t.destination} (${t.activity}${t.date ? `, ${t.date}` : ''})`)
      .join('; ');
    sections.push(
      isGerman
        ? `Geplante Touren: ${trips}`
        : `Upcoming trips: ${trips}`
    );
  }
  if (goals.gearGoals.length > 0) {
    sections.push(
      isGerman
        ? `Gear-Ziele: ${goals.gearGoals.join('; ')}`
        : `Gear goals: ${goals.gearGoals.join('; ')}`
    );
  }

  // Learned facts (high confidence only in prompt to keep it concise)
  const highConfFacts = profile.facts.filter((f) => f.confidence === 'high');
  if (highConfFacts.length > 0) {
    const factList = highConfFacts.map((f) => `- ${f.fact}`).join('\n');
    sections.push(
      isGerman
        ? `Gelernte Fakten:\n${factList}`
        : `Learned facts:\n${factList}`
    );
  }

  // Cached insights (just mention they exist - agent checks before querying)
  if (profile.cachedInsights.length > 0) {
    const insightProducts = profile.cachedInsights
      .map((i) => i.productName)
      .join(', ');
    sections.push(
      isGerman
        ? `Gecachte GearGraph-Insights fuer: ${insightProducts}`
        : `Cached GearGraph insights for: ${insightProducts}`
    );
  }

  // Only return if we have meaningful content beyond the header
  if (sections.length <= 1) {
    return isGerman
      ? '**Arbeitsspeicher:** Noch keine Informationen ueber diesen Nutzer gelernt.'
      : '**Working Memory:** No information learned about this user yet.';
  }

  return sections.join('\n');
}

/**
 * Build working memory update instructions for the agent
 *
 * @param locale - User locale
 * @returns Instruction block for system prompt
 */
export function buildWorkingMemoryInstructions(locale: string = 'en'): string {
  const isGerman = locale === 'de';

  if (isGerman) {
    return `
**Arbeitsspeicher-Aktualisierung:**

Du hast Zugriff auf ein persistentes Nutzerprofil, das du LESEN und AKTUALISIEREN kannst.
Wenn du NEUE Informationen ueber den Nutzer lernst, aktualisiere das entsprechende Feld.

Aktualisiere bei EXPLIZITEN Aussagen:
- "Ich bevorzuge ultraleichtes Gear" → preferences.weightPhilosophy = 'ultralight'
- "Ich plane eine PCT Durchquerung im Mai" → goals.upcomingTrips hinzufuegen
- "Ich mag keine Osprey Rucksaecke" → brands.avoid += 'Osprey'
- "Mein Name ist Sarah" → name = 'Sarah'
- "Ich komme aus Deutschland" → location = 'Deutschland'

Bestatige wichtige Updates: "Ich habe mir gemerkt, dass du ultraleichtes Gear bevorzugst."
Aktualisiere NUR bei expliziten Aussagen, nicht bei Annahmen.`;
  }

  return `
**Working Memory Updates:**

You have access to a persistent user profile that you can READ and UPDATE.
When you learn NEW information about the user, update the appropriate field.

Update on EXPLICIT statements:
- "I prefer ultralight gear" → preferences.weightPhilosophy = 'ultralight'
- "I'm planning a PCT thru-hike in May" → goals.upcomingTrips add entry
- "I don't like Osprey packs" → brands.avoid += 'Osprey'
- "My name is Sarah" → name = 'Sarah'
- "I'm from Colorado" → location = 'Colorado'

Confirm significant updates: "I've noted that you prefer ultralight gear."
Only update on EXPLICIT statements, never from assumptions.`;
}
