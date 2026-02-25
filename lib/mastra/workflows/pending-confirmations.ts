/**
 * Pending Confirmations Store
 * Feature: Suspend/Resume for Human-in-the-Loop Actions
 *
 * In-memory store for tracking suspended workflow runs awaiting user confirmation.
 * Confirmations are ephemeral (5-minute TTL) since users should respond
 * within the active session.
 *
 * This implements the "suspend" side of Mastra's suspend/resume pattern:
 * the workflow pauses here, and the resume API endpoint continues execution.
 *
 * @see https://mastra.ai/docs/workflows/suspend-and-resume
 */

import { randomUUID } from 'crypto';

// =============================================================================
// Types
// =============================================================================

/**
 * Data stored when a workflow suspends for user confirmation
 */
export interface PendingConfirmation {
  /** Unique ID for this pending confirmation */
  runId: string;
  /** User who initiated the action */
  userId: string;
  /** Step that suspended (e.g., 'confirmAdd') */
  suspendedStepId: string;
  /** Human-readable confirmation message */
  message: string;
  /** Payload needed to resume execution */
  payload: AddGearPayload;
  /** When the confirmation was created */
  createdAt: Date;
  /** TTL: confirmation expires after this timestamp */
  expiresAt: Date;
  /** Current status */
  status: 'pending' | 'approved' | 'cancelled' | 'expired';
}

/**
 * Payload for add-gear-to-loadout confirmation
 */
export interface AddGearPayload {
  gearItemId: string;
  gearItemName: string;
  loadoutId: string;
  loadoutName: string;
  quantity: number;
  worn: boolean;
  consumable: boolean;
}

/**
 * Result of a resume operation
 */
export interface ResumeResult {
  success: boolean;
  message: string;
  loadoutItemId?: string;
  updatedTotalWeight?: number;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Confirmation TTL in milliseconds (5 minutes) */
const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

/** Cleanup interval in milliseconds (1 minute) */
const CLEANUP_INTERVAL_MS = 60 * 1000;

// =============================================================================
// Store Implementation
// =============================================================================

/** In-memory store: runId → PendingConfirmation */
const pendingConfirmations = new Map<string, PendingConfirmation>();

/** Cleanup timer reference */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic cleanup of expired confirmations
 */
function ensureCleanupRunning(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = new Date();
    for (const [runId, confirmation] of pendingConfirmations) {
      if (confirmation.expiresAt < now) {
        confirmation.status = 'expired';
        pendingConfirmations.delete(runId);
      }
    }
    // Stop timer if no pending confirmations
    if (pendingConfirmations.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Create a new pending confirmation (suspend workflow)
 *
 * @param userId - Authenticated user ID
 * @param payload - Gear/loadout details for the action
 * @param message - Human-readable confirmation message
 * @returns The created PendingConfirmation with runId
 */
export function suspendForConfirmation(
  userId: string,
  payload: AddGearPayload,
  message: string
): PendingConfirmation {
  const now = new Date();
  const confirmation: PendingConfirmation = {
    runId: randomUUID(),
    userId,
    suspendedStepId: 'confirmAdd',
    message,
    payload,
    createdAt: now,
    expiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
    status: 'pending',
  };

  pendingConfirmations.set(confirmation.runId, confirmation);
  ensureCleanupRunning();

  console.log(
    `[PendingConfirmations] Suspended: runId=${confirmation.runId} ` +
    `item="${payload.gearItemName}" → loadout="${payload.loadoutName}"`
  );

  return confirmation;
}

/**
 * Get a pending confirmation by runId
 *
 * @param runId - The workflow run ID
 * @returns The PendingConfirmation or null if not found/expired
 */
export function getConfirmation(runId: string): PendingConfirmation | null {
  const confirmation = pendingConfirmations.get(runId);
  if (!confirmation) return null;

  // Check expiry
  if (confirmation.expiresAt < new Date()) {
    confirmation.status = 'expired';
    pendingConfirmations.delete(runId);
    return null;
  }

  return confirmation;
}

/**
 * Mark a confirmation as approved or cancelled (resume workflow)
 *
 * @param runId - The workflow run ID
 * @param userId - The user performing the action (must match original user)
 * @param approved - Whether the user approved or cancelled
 * @returns The updated confirmation, or null if not found/unauthorized
 */
export function resolveConfirmation(
  runId: string,
  userId: string,
  approved: boolean
): PendingConfirmation | null {
  const confirmation = getConfirmation(runId);
  if (!confirmation) return null;

  // Security: verify the same user is resolving
  if (confirmation.userId !== userId) {
    console.warn(
      `[PendingConfirmations] User mismatch: expected=${confirmation.userId}, got=${userId}`
    );
    return null;
  }

  // Can only resolve pending confirmations
  if (confirmation.status !== 'pending') {
    return null;
  }

  confirmation.status = approved ? 'approved' : 'cancelled';

  console.log(
    `[PendingConfirmations] Resolved: runId=${runId} status=${confirmation.status}`
  );

  // Remove from pending store after resolution
  pendingConfirmations.delete(runId);

  return confirmation;
}

/**
 * Get all pending confirmations for a user
 *
 * @param userId - User ID
 * @returns Array of pending confirmations
 */
export function getUserPendingConfirmations(userId: string): PendingConfirmation[] {
  const result: PendingConfirmation[] = [];
  const now = new Date();

  for (const confirmation of pendingConfirmations.values()) {
    if (confirmation.userId === userId && confirmation.status === 'pending') {
      if (confirmation.expiresAt >= now) {
        result.push(confirmation);
      }
    }
  }

  return result;
}

/**
 * Get the count of pending confirmations (for monitoring)
 */
export function getPendingCount(): number {
  return pendingConfirmations.size;
}
