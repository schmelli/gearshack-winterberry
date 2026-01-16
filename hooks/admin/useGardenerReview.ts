'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  GardenerReviewItem,
  GardenerReviewItemType,
  GardenerBatchReviewResponse,
  UseGardenerReviewReturn,
} from '@/types/gardener';

// Use local API proxy to avoid CORS issues
const API_BASE_URL = '/api/gardener';

/**
 * Custom hook for managing the interactive review queue.
 * Handles fetching review items, navigation, and approval/rejection actions.
 *
 * Key improvements:
 * - Prevents infinite fetch loops with proper ref tracking
 * - Only fetches one item at a time (not all 18k)
 * - Supports filtering by node type and action
 *
 * API Endpoints:
 * - GET /api/approvals/review - Get next item to review
 * - POST /api/approvals/review - Submit decision
 * - GET /api/approvals/review/stats - Get statistics
 * - POST /api/approvals/review/batch - Batch operations
 */
export function useGardenerReview(): UseGardenerReviewReturn {
  const [currentItem, setCurrentItem] = useState<GardenerReviewItem | null>(null);
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    nodeType?: GardenerReviewItemType;
    action?: string;
  }>({});

  // Track if we've done the initial fetch to prevent loops
  const hasFetched = useRef(false);
  const lastFetchParams = useRef<string>('');
  const isFetching = useRef(false);

  /**
   * Build query string from current filters and skip position
   */
  const buildQueryString = useCallback((skip?: number, filtersOverride?: typeof filters) => {
    const params = new URLSearchParams();
    const activeFilters = filtersOverride ?? filters;
    if (skip !== undefined && skip > 0) params.set('skip', skip.toString());
    if (activeFilters.nodeType) params.set('nodeType', activeFilters.nodeType);
    if (activeFilters.action) params.set('action', activeFilters.action);
    return params.toString();
  }, [filters]);

  /**
   * Fetch the current review item from the queue
   * Uses GET /api/approvals/review endpoint
   *
   * IMPORTANT: This only fetches ONE item at a time to prevent
   * performance issues with large queues (18k+ items)
   */
  const fetchCurrentItem = useCallback(async (targetPosition?: number) => {
    const posToUse = targetPosition ?? position;
    const queryKey = `${posToUse}-${filters.nodeType || ''}-${filters.action || ''}`;

    // Prevent duplicate fetches
    if (isFetching.current) {
      return;
    }

    // Skip if we already fetched this exact combination
    if (lastFetchParams.current === queryKey && currentItem) {
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const query = buildQueryString(posToUse || undefined);
      const url = `${API_BASE_URL}/review${query ? `?${query}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch review item: ${response.status}`);
      }

      const data = await response.json();

      // Map API response to our internal format
      // API returns: { item: { approvalId, nodeName, nodeType, proposedAction, confidence, problem, position, total, remaining }, fullReasoning }
      if (data.item) {
        const mappedItem: GardenerReviewItem = {
          approvalId: data.item.approvalId,
          name: data.item.nodeName,
          nodeType: data.item.nodeType,
          problem: data.item.problem,
          currentData: {
            relationshipCount: 0,
            relationships: [],
            properties: data.item,
          },
          suggestedResolution: data.fullReasoning || '',
          confidence: data.item.confidence || 0,
          createdAt: new Date().toISOString(),
        };
        setCurrentItem(mappedItem);
        // Only update position if it came from the API (don't cause loops)
        if (targetPosition === undefined) {
          setPosition(data.item.position || 0);
        }
        setTotal(data.item.total || 0);
        lastFetchParams.current = queryKey;
      } else {
        setCurrentItem(null);
        setPosition(0);
        setTotal(0);
      }
      hasFetched.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch review item';
      setError(errorMessage);
      setCurrentItem(null);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [buildQueryString, position, filters, currentItem]);

  /**
   * Navigate to the next item in the queue
   */
  const goToNext = useCallback(async () => {
    if (position < total - 1) {
      const newPos = position + 1;
      setPosition(newPos);
      lastFetchParams.current = ''; // Clear cache to force fetch
      await fetchCurrentItem(newPos);
    }
  }, [position, total, fetchCurrentItem]);

  /**
   * Navigate to the previous item in the queue
   */
  const goToPrevious = useCallback(async () => {
    if (position > 0) {
      const newPos = position - 1;
      setPosition(newPos);
      lastFetchParams.current = ''; // Clear cache to force fetch
      await fetchCurrentItem(newPos);
    }
  }, [position, fetchCurrentItem]);

  /**
   * Navigate to a specific position in the queue
   */
  const goToPosition = useCallback(async (newPosition: number) => {
    if (newPosition >= 0 && newPosition < total) {
      setPosition(newPosition);
      lastFetchParams.current = ''; // Clear cache to force fetch
      await fetchCurrentItem(newPosition);
    }
  }, [total, fetchCurrentItem]);

  /**
   * Submit a review decision (approve/reject)
   */
  const submitDecision = useCallback(async (decision: 'approve' | 'reject', notes?: string) => {
    if (!currentItem) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalId: currentItem.approvalId,
          decision,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.status}`);
      }

      const data = await response.json();

      // Update total count
      setTotal(data.remainingItems + 1);

      // If there's a next item, show it; otherwise refetch
      if (data.nextItem) {
        setCurrentItem(data.nextItem);
      } else {
        // Refetch to get the updated queue
        await fetchCurrentItem();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [currentItem, fetchCurrentItem]);

  /**
   * Approve the current item
   */
  const approve = useCallback(async (notes?: string) => {
    await submitDecision('approve', notes);
  }, [submitDecision]);

  /**
   * Reject the current item
   */
  const reject = useCallback(async (notes?: string) => {
    await submitDecision('reject', notes);
  }, [submitDecision]);

  /**
   * Batch approve items by type
   */
  const batchApprove = useCallback(async (
    nodeType?: GardenerReviewItemType,
    limit: number = 100
  ): Promise<GardenerBatchReviewResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/review/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          nodeType,
          limit,
          dryRun: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to batch approve: ${response.status}`);
      }

      const data: GardenerBatchReviewResponse = await response.json();

      // Refetch to update the queue
      lastFetchParams.current = '';
      await fetchCurrentItem();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to batch approve';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchCurrentItem]);

  /**
   * Smart approve preview: get count of items that would be approved (dry run)
   *
   * @param minConfidence - Minimum confidence threshold (0-1, e.g., 0.9 for 90%)
   * @param nodeType - Optional filter by node type
   * @param limit - Maximum items to check (default 500)
   */
  const smartApprovePreview = useCallback(async (
    minConfidence: number = 0.9,
    nodeType?: GardenerReviewItemType,
    limit: number = 500
  ): Promise<{ count: number; items?: Array<{ approvalId: string; name: string; confidence: number }> }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/review/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          nodeType,
          minConfidence,
          limit,
          dryRun: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to preview: ${response.status}`);
      }

      const data = await response.json();
      return {
        count: data.wouldProcess || data.processedCount || 0,
        items: data.preview || data.affectedItems,
      };
    } catch (err) {
      console.error('[SmartApprovePreview] Error:', err);
      return { count: 0 };
    }
  }, []);

  /**
   * Smart approve: batch approve high-confidence items
   * This is the AI-assisted auto-approval feature
   *
   * @param minConfidence - Minimum confidence threshold (0-1, e.g., 0.9 for 90%)
   * @param nodeType - Optional filter by node type
   * @param limit - Maximum items to approve (default 500)
   */
  const smartApprove = useCallback(async (
    minConfidence: number = 0.9,
    nodeType?: GardenerReviewItemType,
    limit: number = 500
  ): Promise<GardenerBatchReviewResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/review/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          nodeType,
          minConfidence,
          limit,
          dryRun: false,
          notes: `Auto-approved by AI (confidence >= ${Math.round(minConfidence * 100)}%)`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to smart approve: ${response.status}`);
      }

      const data: GardenerBatchReviewResponse = await response.json();

      // Refetch to update the queue
      lastFetchParams.current = '';
      await fetchCurrentItem();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to smart approve';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchCurrentItem]);

  /**
   * Set a filter value
   */
  const setFilter = useCallback((key: 'nodeType' | 'action', value: string | undefined) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Clear cache and reset position when filter changes
      lastFetchParams.current = '';
      setPosition(0);
      return newFilters;
    });
  }, []);

  /**
   * Refresh the current view
   */
  const refresh = useCallback(async () => {
    lastFetchParams.current = ''; // Clear cache to force refetch
    await fetchCurrentItem();
  }, [fetchCurrentItem]);

  // Fetch initial item on mount only
  useEffect(() => {
    if (!hasFetched.current) {
      fetchCurrentItem();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when filters change (but not position - position changes trigger direct fetches)
  useEffect(() => {
    if (hasFetched.current) {
      // Filters changed, refetch from position 0
      lastFetchParams.current = '';
      fetchCurrentItem(0);
    }
  }, [filters.nodeType, filters.action]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    currentItem,
    position,
    total,
    isLoading,
    isProcessing,
    error,
    filters,
    fetchCurrentItem,
    goToNext,
    goToPrevious,
    goToPosition,
    approve,
    reject,
    batchApprove,
    smartApprove,
    smartApprovePreview,
    setFilter,
    refresh,
  };
}
