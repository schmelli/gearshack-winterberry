/**
 * Storage Service Validation Schemas
 *
 * Feature: 010-firestore-sync
 * Defines Zod validation schemas and helpers for Firebase Storage operations
 */

import { z } from 'zod';

// =============================================================================
// Upload Configuration
// =============================================================================

export const STORAGE_CONFIG = {
  /** Maximum file size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** Allowed MIME types for gear images */
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ] as const,

  /** Base path for user uploads - matches Firebase Security Rules */
  BASE_PATH: 'userBase',

  /** Subdirectory for gear images - matches Firebase Security Rules */
  GEAR_SUBDIR: 'inventory',
} as const;

// =============================================================================
// Upload Request Schema
// =============================================================================

export const UploadRequestSchema = z.object({
  /** The file to upload */
  file: z.instanceof(File),

  /** User ID for path generation */
  userId: z.string().min(1),

  /** Optional custom filename (defaults to original) */
  customFilename: z.string().optional(),
});

export type UploadRequest = z.infer<typeof UploadRequestSchema>;

// =============================================================================
// Upload Result Schema
// =============================================================================

export const UploadResultSchema = z.object({
  /** Public download URL */
  downloadUrl: z.string().url(),

  /** Full storage path */
  storagePath: z.string(),

  /** File size in bytes */
  sizeBytes: z.number().int().positive(),

  /** Content type */
  contentType: z.string(),
});

export type UploadResult = z.infer<typeof UploadResultSchema>;

// =============================================================================
// Upload Error Types
// =============================================================================

export type UploadErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED'
  | 'NOT_AUTHENTICATED';

export interface UploadError {
  code: UploadErrorCode;
  message: string;
  details?: unknown;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Normalizes a MIME type by removing parameters (e.g., charset)
 * "image/jpeg; charset=utf-8" -> "image/jpeg"
 */
function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';')[0].trim().toLowerCase();
}

/**
 * Validates a file before upload
 * Returns null if valid, error message if invalid
 */
export function validateUploadFile(file: File): string | null {
  // Log for debugging
  console.log('[Storage Validation] Validating file:', {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    const maxMB = STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return `File size exceeds ${maxMB}MB limit`;
  }

  // Normalize the file type to handle cases like "image/jpeg; charset=utf-8"
  const normalizedType = normalizeMimeType(file.type);
  const allowedTypes = STORAGE_CONFIG.ALLOWED_MIME_TYPES as readonly string[];

  // Check if the normalized type matches any allowed type
  const isValidType = allowedTypes.some(allowed =>
    normalizedType === allowed || normalizedType === allowed.toLowerCase()
  );

  if (!isValidType) {
    console.error('[Storage Validation] Invalid type:', normalizedType, 'Allowed:', allowedTypes);
    return `Invalid file type "${file.type}". Allowed: ${STORAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`;
  }

  console.log('[Storage Validation] File valid');
  return null;
}

/**
 * Validates that a string is a valid UUID v4 format
 * Used to prevent path traversal attacks via userId
 */
function isValidUUID(str: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(str);
}

/**
 * Generates a safe filename with timestamp prefix
 * Validates userId to prevent path traversal attacks
 */
export function generateStoragePath(
  userId: string,
  filename: string
): string {
  // Validate userId is a valid UUID to prevent path traversal
  if (!userId || !isValidUUID(userId)) {
    throw new Error('Invalid userId: must be a valid UUID');
  }

  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${STORAGE_CONFIG.BASE_PATH}/${userId}/${STORAGE_CONFIG.GEAR_SUBDIR}/${timestamp}-${safeName}`;
}
