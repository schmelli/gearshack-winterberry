/**
 * Sync Types Schema
 *
 * Feature: 010-firestore-sync
 * Defines TypeScript interfaces and Zod schemas for sync-related types
 */

import { z } from 'zod';

// =============================================================================
// Sync Status
// =============================================================================

export const SyncStatusSchema = z.enum(['idle', 'syncing', 'error']);

export type SyncStatus = z.infer<typeof SyncStatusSchema>;

// =============================================================================
// Sync State
// =============================================================================

export const SyncStateSchema = z.object({
  status: SyncStatusSchema,
  pendingOperations: z.number().int().nonnegative(),
  lastSyncedAt: z.date().nullable(),
  error: z.string().nullable(),
});

export type SyncState = z.infer<typeof SyncStateSchema>;

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_SYNC_STATE: SyncState = {
  status: 'idle',
  pendingOperations: 0,
  lastSyncedAt: null,
  error: null,
};
