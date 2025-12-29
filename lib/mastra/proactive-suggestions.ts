/**
 * Proactive Suggestions Generator
 * Feature: AI Agent Performance Enhancements (Issue #110)
 *
 * Generates context-aware suggestions to help users discover
 * features naturally through conversation.
 *
 * Examples:
 * - "Want me to find lighter alternatives to your current gear?"
 * - "Should I check recent reviews for your loadout items?"
 * - "Interested in weather forecast for your trip dates?"
 */

import type { UserContext } from '@/types/ai-assistant';
import type { LoadoutContext } from './context-preloader';

// =============================================================================
// Types
// =============================================================================

/**
 * Proactive suggestion structure
 */
export interface ProactiveSuggestion {
  /** Suggestion text to show user */
  text: string;
  /** Category of suggestion for analytics */
  category: 'optimization' | 'discovery' | 'planning' | 'maintenance';
  /** Priority (1-5, 1 = highest) */
  priority: number;
}

// =============================================================================
// Suggestion Generators
// =============================================================================

/**
 * Generate proactive suggestions based on user context
 *
 * @param userContext - Current user context
 * @param loadoutContext - Loadout context if on loadout page
 * @param locale - User locale (en | de)
 * @returns Array of suggestions (max 3, sorted by priority)
 */
export function generateProactiveSuggestions(
  userContext: UserContext,
  loadoutContext?: LoadoutContext | null,
  locale: 'en' | 'de' = 'en'
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const isGerman = locale === 'de';

  // Loadout-specific suggestions
  if (userContext.screen === 'loadout-detail' && loadoutContext) {
    // Suggest weight optimization if loadout is heavy
    if (loadoutContext.loadout.totalWeight > 10000) { // > 10kg
      suggestions.push({
        text: isGerman
          ? 'Moechtest du, dass ich leichtere Alternativen fuer deine schwersten Gegenstaende finde?'
          : 'Want me to find lighter alternatives to your heaviest items?',
        category: 'optimization',
        priority: 1,
      });
    }

    // Suggest gear reviews if loadout has many items
    if (loadoutContext.gearItems.length > 15) {
      suggestions.push({
        text: isGerman
          ? 'Soll ich aktuelle Bewertungen fuer die Gegenstaende in deinem Loadout suchen?'
          : 'Should I check recent reviews for items in your loadout?',
        category: 'discovery',
        priority: 3,
      });
    }

    // Suggest weather planning if activities are outdoor
    const hasOutdoorActivity = loadoutContext.loadout.activityTypes.some(activity =>
      ['backpacking', 'hiking', 'camping', 'mountaineering'].includes(activity)
    );
    if (hasOutdoorActivity) {
      suggestions.push({
        text: isGerman
          ? 'Interessiert dich eine Wettervorhersage fuer deine geplante Tour?'
          : 'Interested in weather forecast planning for your trip?',
        category: 'planning',
        priority: 4,
      });
    }

    // Suggest category optimization if one category dominates
    const categoryEntries = Object.entries(loadoutContext.categoryWeights);
    const totalWeight = loadoutContext.loadout.totalWeight;
    for (const [category, weight] of categoryEntries) {
      if (weight / totalWeight > 0.4) { // Category is > 40% of total weight
        suggestions.push({
          text: isGerman
            ? `Deine ${category}-Ausruestung macht ${Math.round((weight / totalWeight) * 100)}% des Gewichts aus. Soll ich Optimierungsvorschlaege machen?`
            : `Your ${category} gear makes up ${Math.round((weight / totalWeight) * 100)}% of your weight. Want optimization suggestions?`,
          category: 'optimization',
          priority: 2,
        });
        break; // Only suggest for the heaviest category
      }
    }
  }

  // Inventory-specific suggestions
  if (userContext.screen === 'inventory') {
    // Suggest building a loadout if they have gear but no loadouts
    if (userContext.inventoryCount > 10) {
      suggestions.push({
        text: isGerman
          ? 'Du hast viel Ausruestung! Moechtest du ein Loadout fuer eine bestimmte Tour erstellen?'
          : 'You have quite a bit of gear! Want to create a loadout for a specific trip?',
        category: 'planning',
        priority: 2,
      });
    }

    // Suggest weight analysis
    if (userContext.inventoryCount > 5) {
      suggestions.push({
        text: isGerman
          ? 'Soll ich dein Inventar nach Gewicht analysieren und die schwersten Kategorien finden?'
          : 'Want me to analyze your inventory by weight and find the heaviest categories?',
        category: 'optimization',
        priority: 3,
      });
    }
  }

  // Wishlist-specific suggestions
  if (userContext.screen === 'wishlist') {
    suggestions.push({
      text: isGerman
        ? 'Moechtest du, dass ich deine Wunschliste mit den aktuellsten Preisen und Bewertungen aktualisiere?'
        : 'Want me to update your wishlist with the latest prices and reviews?',
      category: 'discovery',
      priority: 2,
    });
  }

  // General suggestions (apply to all contexts)
  if (suggestions.length < 2) {
    // Suggest exploring catalog
    suggestions.push({
      text: isGerman
        ? 'Suchst du nach neuer Ausruestung? Ich kann dir helfen, den GearGraph-Katalog zu durchsuchen!'
        : 'Looking for new gear? I can help you search the GearGraph catalog!',
      category: 'discovery',
      priority: 5,
    });
  }

  // Sort by priority and return max 3
  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

/**
 * Format suggestions for streaming to user
 *
 * @param suggestions - Array of suggestions
 * @param locale - User locale
 * @returns Formatted suggestion text
 */
export function formatSuggestionsForStream(
  suggestions: ProactiveSuggestion[],
  locale: 'en' | 'de' = 'en'
): string {
  if (suggestions.length === 0) {
    return '';
  }

  const isGerman = locale === 'de';
  const header = isGerman
    ? '\n\n**Kann ich dir noch helfen?**\n'
    : '\n\n**Can I help you with anything else?**\n';

  const suggestionLines = suggestions.map(s => `- ${s.text}`).join('\n');

  return `${header}${suggestionLines}`;
}

/**
 * Determine if proactive suggestions should be shown
 *
 * Only show suggestions:
 * - After a successful AI response
 * - Not on error states
 * - Not on very short interactions (< 20 characters)
 *
 * @param responseLength - Length of AI response
 * @param hadError - Whether there was an error
 * @returns Whether to show suggestions
 */
export function shouldShowProactiveSuggestions(
  responseLength: number,
  hadError: boolean
): boolean {
  return !hadError && responseLength > 20;
}
