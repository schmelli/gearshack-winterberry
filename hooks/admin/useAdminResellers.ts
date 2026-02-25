/**
 * useAdminResellers Hook
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Admin CRUD operations for reseller catalog management
 *
 * Constitution: All business logic MUST reside in hooks
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  Reseller,
  ResellerListResponse,
  ResellerListFilters,
  ResellerSortField,
  ResellerSortOrder,
  CreateResellerInput,
  UpdateResellerInput,
} from '@/types/reseller';

// =============================================================================
// Types
// =============================================================================

export interface UseAdminResellersOptions {
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Page size (default: 20) */
  pageSize?: number;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

export interface UseAdminResellersReturn {
  /** List of resellers */
  resellers: Reseller[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Current filters */
  filters: ResellerListFilters;
  /** Current sort field */
  sortField: ResellerSortField;
  /** Current sort order */
  sortOrder: ResellerSortOrder;
  /** Fetch resellers */
  fetchResellers: () => Promise<void>;
  /** Set page */
  setPage: (page: number) => void;
  /** Set filters */
  setFilters: (filters: ResellerListFilters) => void;
  /** Set sort */
  setSort: (field: ResellerSortField, order: ResellerSortOrder) => void;
  /** Create reseller */
  createReseller: (data: CreateResellerInput) => Promise<Reseller>;
  /** Update reseller */
  updateReseller: (id: string, data: Partial<UpdateResellerInput>) => Promise<Reseller>;
  /** Delete reseller */
  deleteReseller: (id: string) => Promise<void>;
  /** Toggle active status */
  toggleActive: (id: string) => Promise<void>;
  /** Update status */
  updateStatus: (id: string, status: Reseller['status']) => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAdminResellers(
  options: UseAdminResellersOptions = {}
): UseAdminResellersReturn {
  const {
    initialPage = 1,
    pageSize = 20,
    autoFetch = true,
  } = options;

  // State
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ResellerListFilters>({});
  const [sortField, setSortField] = useState<ResellerSortField>('name');
  const [sortOrder, setSortOrder] = useState<ResellerSortOrder>('asc');

  // Fetch resellers
  // Using individual filter properties as dependencies instead of the object
  // to prevent infinite loops from object reference changes
  const fetchResellers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField,
        sortOrder,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      if (filters.country) params.set('country', filters.country);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));

      const response = await fetch(`/api/admin/resellers?${params}`);

      if (!response.ok) {
        if (response.status === 401) {
          setError('Nicht autorisiert');
          return;
        }
        if (response.status === 403) {
          setError('Admin-Zugriff erforderlich');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ResellerListResponse = await response.json();

      setResellers(data.resellers);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Händler';
      setError(message);
      console.error('[useAdminResellers] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters.search, filters.type, filters.status, filters.country, filters.isActive, sortField, sortOrder]);

  // Set sort
  const setSort = useCallback((field: ResellerSortField, order: ResellerSortOrder) => {
    setSortField(field);
    setSortOrder(order);
    setPage(1); // Reset to first page on sort change
  }, []);

  // Create reseller
  const createReseller = useCallback(async (data: CreateResellerInput): Promise<Reseller> => {
    const response = await fetch('/api/admin/resellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Fehler beim Erstellen');
    }

    const newReseller: Reseller = await response.json();

    // Refresh list
    await fetchResellers();

    return newReseller;
  }, [fetchResellers]);

  // Update reseller
  const updateReseller = useCallback(
    async (id: string, data: Partial<UpdateResellerInput>): Promise<Reseller> => {
      const response = await fetch(`/api/admin/resellers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Aktualisieren');
      }

      const updatedReseller: Reseller = await response.json();

      // Update local state
      setResellers((prev) =>
        prev.map((r) => (r.id === id ? updatedReseller : r))
      );

      return updatedReseller;
    },
    []
  );

  // Delete reseller
  const deleteReseller = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/admin/resellers/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Fehler beim Löschen');
    }

    // Remove from local state
    setResellers((prev) => prev.filter((r) => r.id !== id));
    setTotal((prev) => prev - 1);
  }, []);

  // Toggle active status
  const toggleActive = useCallback(
    async (id: string): Promise<void> => {
      const reseller = resellers.find((r) => r.id === id);
      if (!reseller) return;

      await updateReseller(id, { isActive: !reseller.isActive });
    },
    [resellers, updateReseller]
  );

  // Update status
  const updateStatus = useCallback(
    async (id: string, status: Reseller['status']): Promise<void> => {
      await updateReseller(id, { status });
    },
    [updateReseller]
  );

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchResellers();
    }
  }, [autoFetch, fetchResellers]);

  return {
    resellers,
    total,
    page,
    hasMore,
    isLoading,
    error,
    filters,
    sortField,
    sortOrder,
    fetchResellers,
    setPage,
    setFilters,
    setSort,
    createReseller,
    updateReseller,
    deleteReseller,
    toggleActive,
    updateStatus,
  };
}
