/**
 * useMerchantCatalog Hook
 *
 * Feature: 053-merchant-integration
 * Task: T015
 *
 * Provides catalog management for merchants.
 * Handles CRUD operations, search, and pagination.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMerchantAuth } from './useMerchantAuth';
import {
  fetchMerchantCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from '@/lib/supabase/merchant-queries';
import type {
  MerchantCatalogItem,
  CatalogItemInput,
} from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface CatalogFilters {
  search: string;
  categoryId: string | null;
  showInactive: boolean;
}

export interface CatalogPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type CatalogOperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseMerchantCatalogReturn {
  /** Catalog items for current page */
  items: MerchantCatalogItem[];
  /** Whether loading catalog */
  isLoading: boolean;
  /** Operation status for mutations */
  operationStatus: CatalogOperationStatus;
  /** Error message if operation failed */
  error: string | null;
  /** Current filters */
  filters: CatalogFilters;
  /** Pagination state */
  pagination: CatalogPagination;
  /** Update filters */
  setFilters: (filters: Partial<CatalogFilters>) => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Create new catalog item */
  createItem: (input: CatalogItemInput) => Promise<MerchantCatalogItem | null>;
  /** Update existing item */
  updateItem: (itemId: string, input: Partial<CatalogItemInput & { isActive?: boolean; imageUrl?: string }>) => Promise<boolean>;
  /** Delete (deactivate) item */
  deleteItem: (itemId: string) => Promise<boolean>;
  /** Refresh catalog */
  refresh: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 20;

const DEFAULT_FILTERS: CatalogFilters = {
  search: '',
  categoryId: null,
  showInactive: false,
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMerchantCatalog(): UseMerchantCatalogReturn {
  const { merchant, hasAccess } = useMerchantAuth();

  const [items, setItems] = useState<MerchantCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [operationStatus, setOperationStatus] = useState<CatalogOperationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState<CatalogPagination>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  // Fetch catalog items
  const fetchCatalog = useCallback(async () => {
    if (!merchant?.id || !hasAccess) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const offset = (pagination.page - 1) * pagination.pageSize;
      const { items: fetchedItems, total } = await fetchMerchantCatalog(merchant.id, {
        limit: pagination.pageSize,
        offset,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        activeOnly: !filters.showInactive,
      });

      setItems(fetchedItems);
      setPagination((prev) => ({
        ...prev,
        total,
        totalPages: Math.ceil(total / prev.pageSize),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load catalog';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id, hasAccess, pagination.page, pagination.pageSize, filters]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Update filters (resets to page 1)
  const setFilters = useCallback((newFilters: Partial<CatalogFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Go to specific page
  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages)),
    }));
  }, []);

  // Create new catalog item
  const createItem = useCallback(
    async (input: CatalogItemInput): Promise<MerchantCatalogItem | null> => {
      if (!merchant?.id) {
        setError('No merchant profile');
        return null;
      }

      setOperationStatus('loading');
      setError(null);

      try {
        const newItem = await createCatalogItem(merchant.id, input);

        // Add to local state if it passes current filters
        if (!filters.search || newItem.name.toLowerCase().includes(filters.search.toLowerCase())) {
          setItems((prev) => [newItem, ...prev]);
          setPagination((prev) => ({
            ...prev,
            total: prev.total + 1,
            totalPages: Math.ceil((prev.total + 1) / prev.pageSize),
          }));
        }

        setOperationStatus('success');
        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create item';
        setError(message);
        setOperationStatus('error');
        return null;
      }
    },
    [merchant?.id, filters.search]
  );

  // Update existing item
  const updateItem = useCallback(
    async (
      itemId: string,
      input: Partial<CatalogItemInput & { isActive?: boolean; imageUrl?: string }>
    ): Promise<boolean> => {
      if (!merchant?.id) {
        setError('No merchant profile');
        return false;
      }

      setOperationStatus('loading');
      setError(null);

      try {
        const updatedItem = await updateCatalogItem(itemId, merchant.id, input);

        // Update local state
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? updatedItem : item))
        );

        setOperationStatus('success');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update item';
        setError(message);
        setOperationStatus('error');
        return false;
      }
    },
    [merchant?.id]
  );

  // Delete (deactivate) item
  const deleteItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!merchant?.id) {
        setError('No merchant profile');
        return false;
      }

      setOperationStatus('loading');
      setError(null);

      try {
        await deleteCatalogItem(itemId, merchant.id);

        // Remove from local state if not showing inactive
        if (!filters.showInactive) {
          setItems((prev) => prev.filter((item) => item.id !== itemId));
          setPagination((prev) => ({
            ...prev,
            total: prev.total - 1,
            totalPages: Math.ceil((prev.total - 1) / prev.pageSize),
          }));
        } else {
          // Update isActive to false in local state
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, isActive: false } : item
            )
          );
        }

        setOperationStatus('success');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete item';
        setError(message);
        setOperationStatus('error');
        return false;
      }
    },
    [merchant?.id, filters.showInactive]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    setOperationStatus('idle');
  }, []);

  return {
    items,
    isLoading,
    operationStatus,
    error,
    filters,
    pagination,
    setFilters,
    goToPage,
    createItem,
    updateItem,
    deleteItem,
    refresh: fetchCatalog,
    clearError,
  };
}

// =============================================================================
// Derived Hooks
// =============================================================================

/**
 * Hook for catalog item search/autocomplete
 */
export function useCatalogItemSearch(initialQuery: string = '') {
  const { merchant, hasAccess } = useMerchantAuth();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MerchantCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!merchant?.id || !hasAccess || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { items } = await fetchMerchantCatalog(merchant.id, {
          search: query,
          limit: 10,
          activeOnly: true,
        });
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, merchant?.id, hasAccess]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    clearResults: () => setResults([]),
  };
}

/**
 * Hook for bulk catalog operations
 */
export function useCatalogBulkOperations() {
  const { merchant } = useMerchantAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((itemIds: string[]) => {
    setSelectedIds(new Set(itemIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkDeactivate = useCallback(async (): Promise<number> => {
    if (!merchant?.id || selectedIds.size === 0) return 0;

    setIsProcessing(true);
    let successCount = 0;

    for (const itemId of selectedIds) {
      try {
        await deleteCatalogItem(itemId, merchant.id);
        successCount++;
      } catch {
        // Continue with next item
      }
    }

    setIsProcessing(false);
    clearSelection();
    return successCount;
  }, [merchant?.id, selectedIds, clearSelection]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected: (id: string) => selectedIds.has(id),
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDeactivate,
    isProcessing,
  };
}
