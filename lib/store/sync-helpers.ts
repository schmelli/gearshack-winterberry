/**
 * Sync State Helpers for Zustand Stores
 *
 * Provides common utilities for optimistic updates, rollback patterns,
 * and sync state management used across Supabase-backed stores.
 */

// =============================================================================
// Types
// =============================================================================

export interface SyncState {
  status: 'idle' | 'syncing' | 'error';
  error: string | null;
  lastSyncedAt: Date | null;
  pendingOperations: number;
}

export const DEFAULT_SYNC_STATE: SyncState = {
  status: 'idle',
  error: null,
  lastSyncedAt: null,
  pendingOperations: 0,
};

// =============================================================================
// Sync State Updaters
// =============================================================================

/**
 * Updates sync state when starting a new operation.
 * Increments pending operations counter and sets status to 'syncing'.
 *
 * @param current - Current sync state
 * @returns Updated sync state with incremented pending operations
 *
 * @example
 * ```ts
 * set((state) => ({
 *   syncState: startSyncOperation(state.syncState)
 * }));
 * ```
 */
export function startSyncOperation(current: SyncState): SyncState {
  return {
    ...current,
    status: 'syncing',
    pendingOperations: current.pendingOperations + 1,
  };
}

/**
 * Updates sync state when completing an operation successfully.
 * Decrements pending operations counter, sets status to 'idle' if no pending ops remain,
 * and records the sync timestamp.
 *
 * @param current - Current sync state
 * @returns Updated sync state with decremented pending operations and sync timestamp
 *
 * @example
 * ```ts
 * set((state) => ({
 *   syncState: completeSyncOperation(state.syncState)
 * }));
 * ```
 */
export function completeSyncOperation(current: SyncState): SyncState {
  const newPendingCount = Math.max(0, current.pendingOperations - 1);
  return {
    ...current,
    // Only set to idle when all pending operations are complete
    status: newPendingCount === 0 ? 'idle' : 'syncing',
    pendingOperations: newPendingCount,
    lastSyncedAt: new Date(),
  };
}

/**
 * Updates sync state when an operation fails.
 * Decrements pending operations counter, sets status to 'error',
 * and stores the error message.
 *
 * @param current - Current sync state
 * @param errorMessage - Error message describing the failure
 * @returns Updated sync state with error information
 *
 * @example
 * ```ts
 * set((state) => ({
 *   syncState: failSyncOperation(state.syncState, 'Failed to save item')
 * }));
 * ```
 */
export function failSyncOperation(current: SyncState, errorMessage: string): SyncState {
  return {
    ...current,
    status: 'error',
    error: errorMessage,
    pendingOperations: Math.max(0, current.pendingOperations - 1),
  };
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Extracts error message from unknown error type.
 * Safely handles errors of any type by checking if it's an Error instance.
 *
 * @param error - Unknown error object (from try-catch)
 * @param fallback - Fallback message to use if error is not an Error instance
 * @returns Error message string
 *
 * @example
 * ```ts
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   const message = getErrorMessage(error, 'Operation failed');
 *   console.error(message);
 * }
 * ```
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
