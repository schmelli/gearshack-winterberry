'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  GardenerReviewItem,
  GardenerReviewItemType,
  GardenerBatchReviewResponse,
  UseGardenerReviewReturn,
} from '@/types/gardener';

const GARDENER_BASE_URL = 'https://geargraph.gearshack.app/gardener';
const AUTH_HEADER = 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

/**
 * Custom hook for managing the interactive review queue.
 * Handles fetching review items, navigation, and approval/rejection actions.
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
    problem?: string;
  }>({});

  /**
   * Build query string from current filters and position
   */
  const buildQueryString = useCallback((pos?: number) => {
    const params = new URLSearchParams();
    if (pos !== undefined) params.set('position', pos.toString());
    if (filters.nodeType) params.set('nodeType', filters.nodeType);
    if (filters.problem) params.set('problem', filters.problem);
    return params.toString();
  }, [filters]);

  /**
   * Fetch the current review item from the queue
   */
  const fetchCurrentItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query = buildQueryString(position || undefined);
      const url = `${GARDENER_BASE_URL}/api/approvals/queue${query ? `?${query}` : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: AUTH_HEADER,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch review item: ${response.status}`);
      }

      const data = await response.json();

      setCurrentItem(data.item || null);
      setPosition(data.position || 0);
      setTotal(data.total || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch review item';
      setError(errorMessage);
      setCurrentItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, position]);

  /**
   * Navigate to the next item in the queue
   */
  const goToNext = useCallback(async () => {
    if (position < total - 1) {
      setPosition(position + 1);
    }
  }, [position, total]);

  /**
   * Navigate to the previous item in the queue
   */
  const goToPrevious = useCallback(async () => {
    if (position > 0) {
      setPosition(position - 1);
    }
  }, [position]);

  /**
   * Navigate to a specific position in the queue
   */
  const goToPosition = useCallback(async (newPosition: number) => {
    if (newPosition >= 0 && newPosition < total) {
      setPosition(newPosition);
    }
  }, [total]);

  /**
   * Submit a review decision (approve/reject)
   */
  const submitDecision = useCallback(async (decision: 'approve' | 'reject', notes?: string) => {
    if (!currentItem) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${GARDENER_BASE_URL}/api/approvals/review`, {
        method: 'POST',
        headers: {
          Authorization: AUTH_HEADER,
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
      const response = await fetch(`${GARDENER_BASE_URL}/api/approvals/review/batch`, {
        method: 'POST',
        headers: {
          Authorization: AUTH_HEADER,
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
   * Set a filter value
   */
  const setFilter = useCallback((key: 'nodeType' | 'problem', value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPosition(0); // Reset to first item when filter changes
  }, []);

  /**
   * Refresh the current view
   */
  const refresh = useCallback(async () => {
    await fetchCurrentItem();
  }, [fetchCurrentItem]);

  // Fetch initial item on mount and when position/filters change
  useEffect(() => {
    fetchCurrentItem();
  }, [position, filters.nodeType, filters.problem]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setFilter,
    refresh,
  };
}
