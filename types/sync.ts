/**
 * Sync State Types
 *
 * Feature: 010-firestore-sync
 * Defines TypeScript interfaces for sync state management between local storage and Firestore.
 */

// =============================================================================
// Sync Status
// =============================================================================

/**
 * Represents the current synchronization status
 * - `idle`: No sync operation in progress
 * - `syncing`: Actively synchronizing data with Firestore
 * - `error`: Sync operation failed
 */
export type SyncStatus = 'idle' | 'syncing' | 'error';

// =============================================================================
// Sync State
// =============================================================================

/**
 * Represents the complete state of the synchronization system
 */
export interface SyncState {
  /** Current status of the sync operation */
  status: SyncStatus;

  /** Number of operations waiting to be synchronized */
  pendingOperations: number;

  /** Timestamp of the last successful sync, null if never synced */
  lastSyncedAt: Date | null;

  /** Error message if sync failed, null otherwise */
  error: string | null;
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default initial state for sync operations
 */
export const DEFAULT_SYNC_STATE: SyncState = {
  status: 'idle',
  pendingOperations: 0,
  lastSyncedAt: null,
  error: null,
};
