/**
 * GDPR Compliance Module for Mastra Agent
 * Feature: 001-mastra-agentic-voice
 * Task: T108 - Implement GDPR deletion logic
 *
 * Provides GDPR Article 17 "Right to Erasure" compliance for:
 * - conversation_memory: Persistent chat history
 * - workflow_executions: Trip planner and other workflow records
 * - ai_rate_limits: Rate limit usage data
 *
 * All deletion operations are audited in gdpr_deletion_records.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logInfo, logError, logDebug } from './logging';
import { recordGdprDeletion, recordGdprDeletionDuration } from './metrics';

// Type assertion helper for tables not yet in generated Supabase types
// These tables exist in the database but types need regeneration after migrations
interface UntypedQueryBuilder {
  select: (columns?: string) => UntypedQueryBuilder;
  insert: (data: Record<string, unknown>) => UntypedQueryBuilder;
  update: (data: Record<string, unknown>) => UntypedQueryBuilder;
  delete: () => UntypedQueryBuilder;
  eq: (column: string, value: unknown) => UntypedQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => UntypedQueryBuilder;
  single: () => Promise<{ data: unknown; error: { code: string; message: string } | null }>;
  then: Promise<{ data: unknown[] | null; error: Error | null; count: number | null }>['then'];
}

type AnySupabaseClient = SupabaseClient<Database> & {
  from: (table: string) => UntypedQueryBuilder;
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

// Row type for gdpr_deletion_records table (not yet in generated types)
interface GdprDeletionRow {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  records_deleted: number | null;
  error_message: string | null;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Deletion request status
 */
export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Deletion request record from database
 */
export interface DeletionRecord {
  id: string;
  userId: string;
  status: DeletionStatus;
  requestedAt: Date;
  completedAt: Date | null;
  recordsDeleted: number;
  errorMessage: string | null;
}

/**
 * Result of a deletion request
 */
export interface DeletionRequestResult {
  success: boolean;
  deletionId: string | null;
  error?: string;
}

/**
 * Result of checking deletion status
 */
export interface DeletionStatusResult {
  found: boolean;
  record: DeletionRecord | null;
  error?: string;
}

/**
 * Result of executing deletion
 */
export interface DeletionExecutionResult {
  success: boolean;
  recordsDeleted: {
    conversationMemory: number;
    workflowExecutions: number;
    rateLimitTracking: number;
  };
  error?: string;
}

// ============================================================================
// GDPR Deletion Functions
// ============================================================================

/**
 * Request GDPR deletion for a user (creates audit record)
 *
 * This creates a pending deletion request that can be processed
 * synchronously or by a background job.
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID requesting deletion
 * @returns Deletion request result with deletion ID
 */
export async function requestGdprDeletion(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DeletionRequestResult> {
  logInfo('GDPR deletion requested', { userId });
  recordGdprDeletion('requested');

  try {
    // Call the database function to create deletion request
    // Using type assertion as RPC function isn't in generated types yet
    const client = supabase as unknown as AnySupabaseClient;
    const { data, error } = await client.rpc('request_gdpr_deletion', { p_user_id: userId });

    if (error) {
      logError('Failed to create GDPR deletion request', error as Error, { userId });
      return {
        success: false,
        deletionId: null,
        error: (error as Error).message,
      };
    }

    const deletionId = data as string;

    logInfo('GDPR deletion request created', {
      userId,
      metadata: { deletionId },
    });

    return {
      success: true,
      deletionId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('GDPR deletion request failed', error instanceof Error ? error : undefined, { userId });

    return {
      success: false,
      deletionId: null,
      error: errorMessage,
    };
  }
}

/**
 * Execute GDPR deletion for a user (full erasure)
 *
 * Deletes all user data from:
 * - conversation_memory
 * - workflow_executions
 * - ai_rate_limits
 *
 * @param supabase - Supabase client with service role key
 * @param userId - User ID to delete data for
 * @param deletionId - Optional deletion request ID for audit trail
 * @returns Deletion execution result with record counts
 */
export async function executeGdprDeletion(
  supabase: SupabaseClient<Database>,
  userId: string,
  deletionId?: string
): Promise<DeletionExecutionResult> {
  const startTime = Date.now();

  logInfo('Executing GDPR deletion', {
    userId,
    metadata: { deletionId },
  });

  const counts = {
    conversationMemory: 0,
    workflowExecutions: 0,
    rateLimitTracking: 0,
  };

  // Using type assertion as some tables aren't in generated types yet
  const client = supabase as unknown as AnySupabaseClient;

  try {
    // Update status to processing if deletionId provided
    if (deletionId) {
      await client
        .from('gdpr_deletion_records')
        .update({ status: 'processing' })
        .eq('id', deletionId);
    }

    // Delete conversation memory (ai_messages table)
    const memoryResult = await supabase
      .from('ai_messages')
      .delete()
      .eq('user_id', userId);

    if (!memoryResult.error) {
      // Count is not returned by Supabase delete, estimate from operation
      counts.conversationMemory = memoryResult.count ?? 0;
    } else {
      logError('Failed to delete conversation memory', memoryResult.error, { userId });
    }

    // Delete workflow executions (using client for non-typed table)
    const workflowResult = await client
      .from('workflow_executions')
      .delete()
      .eq('user_id', userId) as { error: Error | null; count: number | null };

    if (!workflowResult.error) {
      counts.workflowExecutions = workflowResult.count ?? 0;
    } else {
      logError('Failed to delete workflow executions', workflowResult.error, { userId });
    }

    // Delete rate limit tracking
    const rateLimitResult = await supabase
      .from('ai_rate_limits')
      .delete()
      .eq('user_id', userId);

    if (!rateLimitResult.error) {
      counts.rateLimitTracking = rateLimitResult.count ?? 0;
    } else {
      logError('Failed to delete rate limit tracking', rateLimitResult.error, { userId });
    }

    // Calculate total deleted
    const totalDeleted = counts.conversationMemory + counts.workflowExecutions + counts.rateLimitTracking;
    const durationMs = Date.now() - startTime;

    // Update deletion record if provided
    if (deletionId) {
      await client
        .from('gdpr_deletion_records')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_deleted: totalDeleted,
        })
        .eq('id', deletionId);
    }

    // Record metrics
    recordGdprDeletion('completed');
    recordGdprDeletionDuration(durationMs);

    logInfo('GDPR deletion completed', {
      userId,
      metadata: {
        deletionId,
        recordsDeleted: totalDeleted,
        durationMs,
        counts,
      },
    });

    return {
      success: true,
      recordsDeleted: counts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;

    // Update deletion record with failure
    if (deletionId) {
      await client
        .from('gdpr_deletion_records')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', deletionId);
    }

    recordGdprDeletion('failed');
    recordGdprDeletionDuration(durationMs);

    logError('GDPR deletion failed', error instanceof Error ? error : undefined, {
      userId,
      metadata: { deletionId, durationMs },
    });

    return {
      success: false,
      recordsDeleted: counts,
      error: errorMessage,
    };
  }
}

/**
 * Get the status of a GDPR deletion request
 *
 * @param supabase - Authenticated Supabase client
 * @param deletionId - Deletion request ID
 * @param userId - User ID (for authorization check)
 * @returns Deletion status result
 */
export async function getGdprDeletionStatus(
  supabase: SupabaseClient<Database>,
  deletionId: string,
  userId: string
): Promise<DeletionStatusResult> {
  logDebug('Checking GDPR deletion status', {
    metadata: { deletionId, userId },
  });

  // Using type assertion as table isn't in generated types yet
  const client = supabase as unknown as AnySupabaseClient;

  try {
    const { data, error } = await client
      .from('gdpr_deletion_records')
      .select('*')
      .eq('id', deletionId)
      .eq('user_id', userId)
      .single() as { data: GdprDeletionRow | null; error: { code: string; message: string } | null };

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return {
          found: false,
          record: null,
        };
      }

      logError('Failed to get deletion status', new Error(error.message), {
        metadata: { deletionId, userId },
      });

      return {
        found: false,
        record: null,
        error: error.message,
      };
    }

    if (!data) {
      return {
        found: false,
        record: null,
      };
    }

    const record: DeletionRecord = {
      id: data.id,
      userId: data.user_id,
      status: data.status as DeletionStatus,
      requestedAt: new Date(data.requested_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      recordsDeleted: data.records_deleted ?? 0,
      errorMessage: data.error_message,
    };

    return {
      found: true,
      record,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logError('Error checking deletion status', error instanceof Error ? error : undefined, {
      metadata: { deletionId, userId },
    });

    return {
      found: false,
      record: null,
      error: errorMessage,
    };
  }
}

/**
 * List all GDPR deletion requests for a user
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns Array of deletion records
 */
export async function listGdprDeletionRequests(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DeletionRecord[]> {
  // Using type assertion as table isn't in generated types yet
  const client = supabase as unknown as AnySupabaseClient;

  try {
    const { data, error } = await client
      .from('gdpr_deletion_records')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false }) as { data: GdprDeletionRow[] | null; error: Error | null };

    if (error) {
      logError('Failed to list deletion requests', error, { userId });
      return [];
    }

    return (data ?? []).map(row => ({
      id: row.id,
      userId: row.user_id,
      status: row.status as DeletionStatus,
      requestedAt: new Date(row.requested_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      recordsDeleted: row.records_deleted ?? 0,
      errorMessage: row.error_message,
    }));
  } catch (error) {
    logError('Error listing deletion requests', error instanceof Error ? error : undefined, { userId });
    return [];
  }
}

// ============================================================================
// Log Sanitization (T112)
// ============================================================================

/**
 * Patterns to identify and sanitize in logs
 */
const SANITIZATION_PATTERNS = {
  // User IDs (UUIDs)
  userId: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers
  phone: /\+?[1-9]\d{1,14}/g,
  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Sanitize a log message by replacing PII with anonymized placeholders
 *
 * @param message - Log message to sanitize
 * @param options - Sanitization options
 * @returns Sanitized message
 */
export function sanitizeLogMessage(
  message: string,
  options: {
    anonymizeUserIds?: boolean;
    anonymizeEmails?: boolean;
    anonymizePhones?: boolean;
    anonymizeIPs?: boolean;
  } = {}
): string {
  const {
    anonymizeUserIds = true,
    anonymizeEmails = true,
    anonymizePhones = true,
    anonymizeIPs = true,
  } = options;

  let sanitized = message;

  if (anonymizeUserIds) {
    sanitized = sanitized.replace(SANITIZATION_PATTERNS.userId, '[REDACTED-USER-ID]');
  }

  if (anonymizeEmails) {
    sanitized = sanitized.replace(SANITIZATION_PATTERNS.email, '[REDACTED-EMAIL]');
  }

  if (anonymizePhones) {
    sanitized = sanitized.replace(SANITIZATION_PATTERNS.phone, '[REDACTED-PHONE]');
  }

  if (anonymizeIPs) {
    sanitized = sanitized.replace(SANITIZATION_PATTERNS.ipAddress, '[REDACTED-IP]');
  }

  return sanitized;
}

/**
 * Sanitize a log object by replacing PII in string values
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeLogObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeLogMessage(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
