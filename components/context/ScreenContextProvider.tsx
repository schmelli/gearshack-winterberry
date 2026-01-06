/**
 * ScreenContextProvider Component
 *
 * Feature: AI Agent Context-Awareness Enhancement
 *
 * Provides screen context tracking across the app so the AI assistant
 * knows which page/loadout/gear item the user is currently viewing.
 *
 * This enables context-aware AI responses like:
 * - "I see you're looking at your Swedish Lapland loadout..."
 * - "Based on the gear item you're viewing..."
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Screen types that can be tracked across the app.
 * These map to the main sections/pages where the AI might need context.
 */
export type ScreenType =
  | 'inventory'
  | 'inventory-detail'      // Viewing specific gear item
  | 'loadouts-list'
  | 'loadout-detail'        // Viewing specific loadout
  | 'wishlist'
  | 'community-hub'
  | 'community-shakedowns'
  | 'community-marketplace'
  | 'community-feed'
  | 'settings'
  | 'profile'
  | 'unknown';

/**
 * Screen context value - provides current screen state and setters.
 */
interface ScreenContextValue {
  /** Current screen/section the user is viewing */
  screen: ScreenType;

  /** Current loadout ID if on loadout-detail screen */
  currentLoadoutId: string | null;

  /** Current loadout name for display purposes */
  currentLoadoutName: string | null;

  /** Current gear item ID if on inventory-detail screen */
  currentGearItemId: string | null;

  /** Current gear item name for display purposes */
  currentGearItemName: string | null;

  /** Set the current screen type */
  setScreen: (screen: ScreenType) => void;

  /** Set the current loadout (id and optionally name) */
  setCurrentLoadout: (id: string | null, name?: string | null) => void;

  /** Set the current gear item (id and optionally name) */
  setCurrentGearItem: (id: string | null, name?: string | null) => void;

  /** Clear all context (call on page unmount) */
  clearContext: () => void;
}

// =============================================================================
// Context
// =============================================================================

const ScreenContext = createContext<ScreenContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface ScreenContextProviderProps {
  children: ReactNode;
}

/**
 * ScreenContextProvider
 *
 * Wraps the app to provide screen context tracking.
 * Pages should call setScreen/setCurrentLoadout on mount.
 *
 * @example
 * // In loadout detail page:
 * const { setScreen, setCurrentLoadout, clearContext } = useScreenContext();
 *
 * useEffect(() => {
 *   setScreen('loadout-detail');
 *   setCurrentLoadout(loadoutId, loadout.name);
 *   return () => clearContext();
 * }, [loadoutId, loadout.name]);
 */
export function ScreenContextProvider({ children }: ScreenContextProviderProps) {
  // State for tracking current screen context
  const [screen, setScreenState] = useState<ScreenType>('unknown');
  const [currentLoadoutId, setLoadoutId] = useState<string | null>(null);
  const [currentLoadoutName, setLoadoutName] = useState<string | null>(null);
  const [currentGearItemId, setGearItemId] = useState<string | null>(null);
  const [currentGearItemName, setGearItemName] = useState<string | null>(null);

  // Setter callbacks (stable references with useCallback)
  const setScreen = useCallback((newScreen: ScreenType) => {
    setScreenState(newScreen);
  }, []);

  const setCurrentLoadout = useCallback((id: string | null, name?: string | null) => {
    setLoadoutId(id);
    setLoadoutName(name ?? null);
  }, []);

  const setCurrentGearItem = useCallback((id: string | null, name?: string | null) => {
    setGearItemId(id);
    setGearItemName(name ?? null);
  }, []);

  const clearContext = useCallback(() => {
    setScreenState('unknown');
    setLoadoutId(null);
    setLoadoutName(null);
    setGearItemId(null);
    setGearItemName(null);
  }, []);

  // Build context value with useMemo to prevent unnecessary re-renders
  const value: ScreenContextValue = useMemo(
    () => ({
      screen,
      currentLoadoutId,
      currentLoadoutName,
      currentGearItemId,
      currentGearItemName,
      setScreen,
      setCurrentLoadout,
      setCurrentGearItem,
      clearContext,
    }),
    [
      screen,
      currentLoadoutId,
      currentLoadoutName,
      currentGearItemId,
      currentGearItemName,
      setScreen,
      setCurrentLoadout,
      setCurrentGearItem,
      clearContext,
    ]
  );

  return (
    <ScreenContext.Provider value={value}>
      {children}
    </ScreenContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access screen context values.
 *
 * @throws Error if used outside ScreenContextProvider
 *
 * @example
 * const { screen, currentLoadoutId, setScreen } = useScreenContext();
 */
export function useScreenContext(): ScreenContextValue {
  const context = useContext(ScreenContext);

  if (!context) {
    throw new Error('useScreenContext must be used within a ScreenContextProvider');
  }

  return context;
}

/**
 * Optional hook that returns null instead of throwing if outside provider.
 * Useful for components that may be rendered outside the provider context.
 */
export function useScreenContextSafe(): ScreenContextValue | null {
  return useContext(ScreenContext);
}
