/**
 * Firebase Storage Service
 *
 * Feature: 010-firestore-sync
 * Handles image uploads to Firebase Storage for gear items
 */

// CHANGE: Import uploadBytesResumable instead of uploadBytes
import { ref, uploadBytesResumable, getDownloadURL, type UploadMetadata } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import {
  validateUploadFile,
  generateStoragePath,
  type UploadResult,
  type UploadError,
  type UploadErrorCode,
} from '@/lib/validations/storage';

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

/**
 * DEPRECATION NOTICE:
 *
 * This function is deprecated for direct file uploads as of Feature 038 (Cloudinary Migration).
 *
 * For NEW direct file uploads (e.g., from user's device):
 * - Use the `useCloudinaryUpload` hook instead
 * - Cloudinary provides better performance, transformations, and CDN delivery
 *
 * This function is maintained ONLY for:
 * - Backward compatibility with external image imports (e.g., Google Image Search)
 * - Legacy code that relies on Firebase Storage
 *
 * @deprecated Use `useCloudinaryUpload` hook for direct file uploads
 * @see hooks/useCloudinaryUpload.ts
 *
 * Uploads a gear image to Firebase Storage
 * @param file - The image file to upload
 * @param userId - The authenticated user's ID
 * @returns Upload result with download URL and metadata
 * @throws {StorageUploadError} If upload fails or validation fails
 */
export async function uploadGearImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  const validationError = validateUploadFile(file);
  if (validationError) {
    const code: UploadErrorCode = validationError.includes('size')
      ? 'FILE_TOO_LARGE'
      : 'INVALID_FILE_TYPE';
    throw new StorageUploadError(code, validationError);
  }

  const storagePath = generateStoragePath(userId, file.name);
  console.log('[Storage] Starting upload to path:', storagePath);

  try {
    const storageRef = ref(storage, storagePath);

    // Force content type logic
    let contentType = file.type;
    if (!contentType || contentType === 'application/octet-stream') {
      console.warn('[Storage] File has generic/missing type, forcing image/jpeg');
      contentType = 'image/jpeg';
    }

    const metadata: UploadMetadata = {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalFilename: file.name,
      },
    };

    console.log('[Storage] Upload metadata prepared:', {
      contentType: metadata.contentType,
      size: file.size
    });

    // CHANGE: Use resumable upload. This creates a new session and handles 412s better.
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    // Wait for completion
    await new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // Optional: You could track progress here
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`[Storage] Upload is ${progress}% done`);
            },
            (error) => {
                // Handle unsuccessful uploads
                reject(error);
            },
            () => {
                // Handle successful uploads on complete
                resolve(null);
            }
        );
    });

    const downloadUrl = await getDownloadURL(storageRef);
    console.log('[Storage] Upload successful. Download URL generated.');

    return {
      downloadUrl,
      storagePath,
      sizeBytes: file.size,
      contentType,
    };
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firebaseError = error as any;
    
    console.error('[Storage] ====== UPLOAD FAILED ======');
    console.error('[Storage] Code:', firebaseError.code);
    console.error('[Storage] Message:', firebaseError.message);
    
    let userMessage = 'Failed to upload image to Firebase Storage';
    
    if (firebaseError.code === 'storage/unauthorized') {
      userMessage = 'Permission denied. Please check if you are logged in.';
    } else if (firebaseError.code === 'storage/canceled') {
      userMessage = 'Upload was canceled';
    } else if (firebaseError.message && firebaseError.message.includes('412')) {
      // Specific handling for the 412 Loop
      userMessage = 'Upload session conflict. Please clear your browser cache and try again.';
    }

    throw new StorageUploadError(
      'UPLOAD_FAILED',
      userMessage,
      { originalError: firebaseError }
    );
  }
}