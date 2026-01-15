'use client';

import { useState, useCallback, useEffect } from 'react';
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

  /**
   * Build query string from current filters and skip position
   */
  const buildQueryString = useCallback((skip?: number) => {
    const params = new URLSearchParams();
    if (skip !== undefined && skip > 0) params.set('skip', skip.toString());
    if (filters.nodeType) params.set('nodeType', filters.nodeType);
    if (filters.action) params.set('action', filters.action);
    return params.toString();
  }, [filters]);

  /**
   * Fetch the current review item from the queue
   * Uses GET /api/approvals/review endpoint
   */
  const fetchCurrentItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query = buildQueryString(position || undefined);
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
        setPosition(data.item.position || 0);
        setTotal(data.item.total || 0);
      } else {
        setCurrentItem(null);
        setPosition(0);
        setTotal(0);
      }
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
  const setFilter = useCallback((key: 'nodeType' | 'action', value: string | undefined) => {
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
  }, [position, filters.nodeType, filters.action]); // eslint-disable-line react-hooks/exhaustive-deps

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
