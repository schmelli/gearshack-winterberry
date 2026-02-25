'use client';

/**
 * useShakedown Hook
 *
 * Feature: 001-community-shakedowns
 * Task: T024
 *
 * Fetches a single shakedown by ID with its loadout data and feedback tree.
 * Used on the shakedown detail page to display full shakedown information.
 *
 * Features:
 * - Fetches shakedown with author details via GET /api/shakedowns/[id]
 * - Includes loadout data with gear items
 * - Includes feedback tree (pre-built on server, or built client-side)
 * - Supports share token access for private shakedowns
 * - Computes isOwner based on current user
 * - Auto-refreshes when shakedownId changes
 * - Graceful error handling for 404 and 403 responses
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { buildFeedbackTree } from '@/lib/shakedown-utils';
import type {
  ShakedownWithAuthor,
  FeedbackWithAuthor,
  FeedbackNode,
} from '@/types/shakedown';
import type { Loadout } from '@/types/loadout';

// =============================================================================
// Gear Item Type (from API response)
// =============================================================================

/**
 * Gear item data as returned from the shakedown detail API
 */
export interface ShakedownGearItem {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  weightGrams: number | null;
  imageUrl: string | null;
  productTypeId: string | null;
  /** Localized category name */
  categoryName: string | null;
  /** Whether item is worn (affects base weight calculation) */
  isWorn?: boolean;
  /** Whether item is consumable */
  isConsumable?: boolean;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Error types specific to shakedown fetching
 */
export type ShakedownErrorType = 'not_found' | 'forbidden' | 'network' | 'unknown';

/**
 * Extended Error with type information
 */
export interface ShakedownFetchError extends Error {
  type: ShakedownErrorType;
  status?: number;
}

/**
 * API Response shape from GET /api/shakedowns/[id]
 */
interface ShakedownDetailResponse {
  shakedown: ShakedownWithAuthor;
  loadout: LoadoutApiResponseWithGearItems;
  feedback: FeedbackWithAuthor[];
}

/**
 * Extended loadout API response that includes gear items
 */
interface LoadoutApiResponseWithGearItems {
  id: string;
  name: string;
  description: string | null;
  totalWeight: number;
  itemCount: number;
  gearItems: Array<{
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    weightGrams: number | null;
    imageUrl: string | null;
    productTypeId: string | null;
    categoryName: string | null;
    quantity: number;
    isWorn: boolean;
    isConsumable: boolean;
  }>;
}


/**
 * Return type for useShakedown hook
 */
export interface UseShakedownReturn {
  /** The shakedown with author details, or null if not loaded/found */
  shakedown: ShakedownWithAuthor | null;
  /** The associated loadout, or null if not loaded */
  loadout: Loadout | null;
  /** Gear items in the loadout */
  gearItems: ShakedownGearItem[];
  /** Feedback organized as a tree structure */
  feedbackTree: FeedbackNode[];
  /** Loading state */
  isLoading: boolean;
  /** Error state with type information */
  error: ShakedownFetchError | null;
  /** Refresh function to re-fetch the shakedown */
  refresh: () => Promise<void>;
  /** Whether the current user is the shakedown owner */
  isOwner: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a typed error with status information
 */
function createShakedownError(
  message: string,
  type: ShakedownErrorType,
  status?: number
): ShakedownFetchError {
  const error = new Error(message) as ShakedownFetchError;
  error.type = type;
  error.status = status;
  return error;
}


// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Fetches a single shakedown with full details
 *
 * @param shakedownId - The shakedown ID to fetch, or null to skip fetching
 * @param shareToken - Optional share token for accessing private shakedowns
 * @returns Object containing shakedown data, loadout, feedback tree, and state
 *
 * @example
 * ```tsx
 * const { shakedown, loadout, feedbackTree, isLoading, error, isOwner } =
 *   useShakedown(shakedownId, shareToken);
 *
 * if (isLoading) return <Spinner />;
 * if (error?.type === 'not_found') return <NotFound />;
 * if (!shakedown) return null;
 * ```
 */
export function useShakedown(
  shakedownId: string | null,
  shareToken?: string
): UseShakedownReturn {
  const { user } = useAuthContext();

  // State
  const [shakedown, setShakedown] = useState<ShakedownWithAuthor | null>(null);
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [gearItems, setGearItems] = useState<ShakedownGearItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ShakedownFetchError | null>(null);

  /**
   * Fetches shakedown data from the API
   */
  const fetchShakedown = useCallback(async () => {
    // Skip if no shakedown ID provided
    if (!shakedownId) {
      setShakedown(null);
      setLoadout(null);
      setGearItems([]);
      setFeedback([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build URL with optional share token
      const url = new URL(`/api/shakedowns/${shakedownId}`, window.location.origin);
      if (shareToken) {
        url.searchParams.set('shareToken', shareToken);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
      });

      // Handle error responses
      if (!response.ok) {
        let errorType: ShakedownErrorType = 'unknown';
        let message = 'Failed to fetch shakedown';

        if (response.status === 404) {
          errorType = 'not_found';
          message = 'Shakedown not found';
        } else if (response.status === 403) {
          errorType = 'forbidden';
          message = 'You do not have permission to view this shakedown';
        } else if (response.status >= 500) {
          errorType = 'network';
          message = 'Server error occurred';
        }

        // Try to get error message from response
        try {
          const errorData = await response.json();
          if (errorData.error) {
            message = errorData.error;
          }
        } catch {
          // Ignore JSON parse errors
        }

        throw createShakedownError(message, errorType, response.status);
      }

      // Parse successful response
      const data: ShakedownDetailResponse = await response.json();

      // Set state with fetched data
      setShakedown(data.shakedown);
      // Note: API returns simplified loadout, we create a minimal Loadout object
      if (data.loadout) {
        // Extract item states from gear items (isWorn, isConsumable flags)
        const extractedItemStates = data.loadout.gearItems.map((item) => ({
          itemId: item.id,
          quantity: item.quantity ?? 1,
          isWorn: item.isWorn ?? false,
          isConsumable: item.isConsumable ?? false,
        }));

        setLoadout({
          id: data.loadout.id,
          name: data.loadout.name,
          tripDate: null,
          itemIds: data.loadout.gearItems.map((item) => item.id),
          activityTypes: undefined,
          seasons: undefined,
          description: data.loadout.description,
          itemStates: extractedItemStates,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Map gear items with isWorn/isConsumable for direct access
        const mappedGearItems: ShakedownGearItem[] = data.loadout.gearItems.map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          description: item.description,
          weightGrams: item.weightGrams,
          imageUrl: item.imageUrl,
          productTypeId: item.productTypeId,
          categoryName: item.categoryName,
          isWorn: item.isWorn,
          isConsumable: item.isConsumable,
        }));
        setGearItems(mappedGearItems);
      } else {
        setLoadout(null);
        setGearItems([]);
      }
      setFeedback(data.feedback || []);
    } catch (err) {
      // Handle fetch/network errors
      if (err instanceof Error) {
        if ('type' in err) {
          // Already a ShakedownFetchError
          setError(err as ShakedownFetchError);
        } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
          // Network error
          setError(createShakedownError('Network error occurred', 'network'));
        } else {
          setError(createShakedownError(err.message, 'unknown'));
        }
      } else {
        setError(createShakedownError('An unexpected error occurred', 'unknown'));
      }

      // Clear data on error
      setShakedown(null);
      setLoadout(null);
      setGearItems([]);
      setFeedback([]);
    } finally {
      setIsLoading(false);
    }
  }, [shakedownId, shareToken]);

  /**
   * Public refresh function
   */
  const refresh = useCallback(async () => {
    await fetchShakedown();
  }, [fetchShakedown]);

  // Auto-fetch when shakedownId or shareToken changes
  useEffect(() => {
    fetchShakedown();
  }, [fetchShakedown]);

  // Build feedback tree from flat feedback array
  const feedbackTree = useMemo(() => {
    if (!feedback.length) return [];
    return buildFeedbackTree(feedback);
  }, [feedback]);

  // Compute isOwner based on current user
  const isOwner = useMemo(() => {
    if (!user || !shakedown) return false;
    return user.uid === shakedown.ownerId;
  }, [user, shakedown]);

  return {
    shakedown,
    loadout,
    gearItems,
    feedbackTree,
    isLoading,
    error,
    refresh,
    isOwner,
  };
}

export default useShakedown;
