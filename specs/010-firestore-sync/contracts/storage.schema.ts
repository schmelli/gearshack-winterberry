/**
 * Storage Service Schema
 *
 * Feature: 010-firestore-sync
 * Defines types and validation for Firebase Storage operations
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

  /** Base path for user uploads */
  BASE_PATH: 'user-uploads',

  /** Subdirectory for gear images */
  GEAR_SUBDIR: 'gear',
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
 * Validates a file before upload
 * Returns null if valid, error message if invalid
 */
export function validateUploadFile(file: File): string | null {
  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    const maxMB = STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return `File size exceeds ${maxMB}MB limit`;
  }

  const allowedTypes = STORAGE_CONFIG.ALLOWED_MIME_TYPES as readonly string[];
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${STORAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`;
  }

  return null;
}

/**
 * Generates a safe filename with timestamp prefix
 */
export function generateStoragePath(
  userId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${STORAGE_CONFIG.BASE_PATH}/${userId}/${STORAGE_CONFIG.GEAR_SUBDIR}/${timestamp}-${safeName}`;
}
