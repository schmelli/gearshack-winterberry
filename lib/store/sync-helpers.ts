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
 * Creates sync state for starting an operation
 */
export function startSyncOperation(current: SyncState): SyncState {
  return {
    ...current,
    status: 'syncing',
    pendingOperations: current.pendingOperations + 1,
  };
}

/**
 * Creates sync state for completing an operation successfully
 */
export function completeSyncOperation(current: SyncState): SyncState {
  return {
    ...current,
    status: 'idle',
    pendingOperations: Math.max(0, current.pendingOperations - 1),
    lastSyncedAt: new Date(),
  };
}

/**
 * Creates sync state for a failed operation
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
 * Extracts error message from unknown error
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
