/**
 * Firebase Storage Service
 *
 * Feature: 010-firestore-sync
 * Handles image uploads to Firebase Storage for gear items
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import {
  validateUploadFile,
  generateStoragePath,
  type UploadResult,
  type UploadError,
  type UploadErrorCode,
} from '@/lib/validations/storage';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Custom error class for storage upload failures
 * Implements UploadError interface from validations/storage
 */
export class StorageUploadError extends Error implements UploadError {
  constructor(
    public code: UploadErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'StorageUploadError';
  }
}

// =============================================================================
// Upload Service
// =============================================================================

/**
 * Uploads a gear image to Firebase Storage
 *
 * @param file - The image file to upload (JPEG, PNG, WebP, or GIF)
 * @param userId - The user's UID for path generation
 * @returns Promise resolving to UploadResult with downloadUrl and metadata
 * @throws StorageUploadError with code and message on failure
 *
 * @example
 * ```typescript
 * try {
 *   const result = await uploadGearImage(file, currentUser.uid);
 *   console.log('Uploaded:', result.downloadUrl);
 * } catch (error) {
 *   if (error instanceof StorageUploadError) {
 *     if (error.code === 'FILE_TOO_LARGE') {
 *       toast.error('File is too large. Max size is 10MB.');
 *     }
 *   }
 * }
 * ```
 */
export async function uploadGearImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate file before upload
  const validationError = validateUploadFile(file);
  if (validationError) {
    // Determine error code based on validation message
    const code: UploadErrorCode = validationError.includes('size')
      ? 'FILE_TOO_LARGE'
      : 'INVALID_FILE_TYPE';

    throw new StorageUploadError(code, validationError);
  }

  // Generate storage path with timestamp and safe filename
  const storagePath = generateStoragePath(userId, file.name);

  // FR-002: Log storage path for debugging
  console.log('[Storage] Uploading to path:', storagePath);

  try {
    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // FR-037: Force valid content-type metadata for Firebase Storage security rules
    // Firebase Storage rules require: request.resource.contentType.matches('image/.*')
    const contentType = (file.type && file.type.startsWith('image/'))
      ? file.type
      : 'image/jpeg';

    // Upload file with explicit metadata
    const metadata = {
      contentType, // CRITICAL: Must be image/* for security rules
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalFilename: file.name,
      },
    };

    // FR-037: Log for debugging upload issues
    console.log('[Storage] Upload metadata:', {
      contentType: metadata.contentType,
      fileType: file.type,
      fileName: file.name,
      fileSize: file.size
    });

    await uploadBytes(storageRef, file, metadata);

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);

    // Return structured result
    const result: UploadResult = {
      downloadUrl,
      storagePath,
      sizeBytes: file.size,
      contentType,
    };

    console.log('[Storage] Upload successful:', storagePath);
    return result;
  } catch (error) {
    // FR-037: Log detailed Firebase error for debugging before re-throwing
    const firebaseError = error as { code?: string; message?: string; serverResponse?: string };
    console.error('[Storage] ====== UPLOAD FAILED ======');
    console.error('[Storage] Error code:', firebaseError.code);
    console.error('[Storage] Error message:', firebaseError.message);
    console.error('[Storage] Server response:', firebaseError.serverResponse);
    console.error('[Storage] Storage path:', storagePath);
    console.error('[Storage] File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    console.error('[Storage] Full error object:', error);

    // Build a descriptive error message for the user
    let userMessage = 'Failed to upload image to Firebase Storage';
    if (firebaseError.code === 'storage/unauthorized') {
      userMessage = 'Upload denied: Check Firebase Storage security rules';
    } else if (firebaseError.code === 'storage/canceled') {
      userMessage = 'Upload was canceled';
    } else if (firebaseError.code === 'storage/unknown') {
      userMessage = `Upload failed: ${firebaseError.message || 'Unknown error'}`;
    } else if (firebaseError.code) {
      userMessage = `Upload failed (${firebaseError.code}): ${firebaseError.message || 'Unknown error'}`;
    }

    // Wrap Firebase errors in StorageUploadError with descriptive message
    throw new StorageUploadError(
      'UPLOAD_FAILED',
      userMessage,
      { code: firebaseError.code, message: firebaseError.message, serverResponse: firebaseError.serverResponse }
    );
  }
}
