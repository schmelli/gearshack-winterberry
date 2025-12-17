/**
 * useContextDetection Hook
 * Feature 050: AI Assistant - T022
 *
 * Automatically detects user context for AI prompt building:
 * - Current screen/route
 * - Locale preference
 * - Inventory count
 * - Current loadout ID (if viewing loadout)
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { UserContext } from '@/types/ai-assistant';

interface UseContextDetectionResult {
  context: UserContext | null;
  isLoading: boolean;
}

/**
 * Hook for detecting user context for AI interactions
 *
 * @param userId - Current user ID
 * @param subscriptionTier - User's subscription tier
 * @returns Current user context
 */
export function useContextDetection(
  userId: string | null,
  subscriptionTier: 'standard' | 'trailblazer' = 'standard'
): UseContextDetectionResult {
  const [context, setContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pathname = usePathname();
  const locale = useLocale();
  const supabase = createClient();

  useEffect(() => {
    if (!userId) {
      setContext(null);
      setIsLoading(false);
      return;
    }

    const detectContext = async () => {
      setIsLoading(true);

      try {
        // Determine current screen
        const screen = pathname || '/';

        // Extract loadout ID if viewing loadout detail
        const loadoutMatch = pathname?.match(/\/loadouts\/([a-z0-9-]+)/);
        const currentLoadoutId = loadoutMatch?.[1] || undefined;

        // Fetch inventory count
        const { count: inventoryCount } = await supabase
          .from('gear_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const newContext: UserContext = {
          screen,
          locale,
          inventoryCount: inventoryCount || 0,
          currentLoadoutId,
          userId,
          subscriptionTier,
        };

        setContext(newContext);
      } catch (error) {
        console.error('Error detecting context:', error);

        // Fallback context
        setContext({
          screen: pathname || '/',
          locale,
          inventoryCount: 0,
          userId,
          subscriptionTier,
        });
      } finally {
        setIsLoading(false);
      }
    };

    detectContext();
  }, [userId, pathname, locale, subscriptionTier, supabase]);

  return {
    context,
    isLoading,
  };
}

/**
 * Get user-friendly screen name for display
 *
 * @param screen - Route pathname
 * @returns Human-readable screen name
 */
export function getScreenDisplayName(screen: string): string {
  if (screen === '/') return 'Home';
  if (screen.startsWith('/inventory')) return 'Inventory';
  if (screen.startsWith('/loadouts')) return 'Loadouts';
  if (screen.startsWith('/community')) return 'Community';
  if (screen.startsWith('/profile')) return 'Profile';
  if (screen.startsWith('/gear/')) return 'Gear Details';

  return 'App';
}

/**
 * Determine if current context is suitable for AI assistance
 *
 * AI assistant is most helpful on:
 * - Inventory screens (gear recommendations)
 * - Loadout screens (weight optimization)
 * - Gear detail screens (specifications)
 *
 * @param screen - Current route pathname
 * @returns True if AI can provide contextual help
 */
export function isAIContextRelevant(screen: string): boolean {
  return (
    screen.startsWith('/inventory') ||
    screen.startsWith('/loadouts') ||
    screen.startsWith('/gear/')
  );
}
