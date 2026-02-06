/**
 * useScreenEffect Hook
 *
 * Sets the AI Assistant screen context for the current page.
 * Automatically clears context on unmount.
 *
 * Feature: Code Quality Review
 * Extracts repeated useEffect pattern from page components
 * following Feature-Sliced Light architecture (no useEffect in UI components).
 */

import { useEffect } from 'react';
import { useScreenContext, type ScreenType } from '@/components/context/ScreenContextProvider';

/**
 * Sets the screen context for the AI assistant and clears it on unmount.
 *
 * @param screen - The screen identifier to set (e.g. 'inventory', 'loadouts-list')
 *
 * @example
 * // Simple static screen
 * useScreenEffect('inventory');
 *
 * @example
 * // Dynamic screen based on view mode
 * useScreenEffect(viewMode === 'wishlist' ? 'wishlist' : 'inventory');
 */
export function useScreenEffect(screen: ScreenType): void {
  const { setScreen, clearContext } = useScreenContext();

  useEffect(() => {
    setScreen(screen);
    return () => clearContext();
  }, [screen, setScreen, clearContext]);
}

/**
 * Sets the screen context for a loadout detail page.
 * Also sets the current loadout ID and name for richer AI context.
 * Clears all context on unmount.
 *
 * @param loadoutId - The loadout ID
 * @param loadoutName - The loadout name (undefined while loading)
 *
 * @example
 * useLoadoutScreenEffect(id, loadout?.name);
 */
export function useLoadoutScreenEffect(
  loadoutId: string,
  loadoutName: string | undefined
): void {
  const { setScreen, setCurrentLoadout, clearContext } = useScreenContext();

  useEffect(() => {
    if (loadoutName) {
      setScreen('loadout-detail');
      setCurrentLoadout(loadoutId, loadoutName);
    }
    return () => clearContext();
  }, [loadoutId, loadoutName, setScreen, setCurrentLoadout, clearContext]);
}
