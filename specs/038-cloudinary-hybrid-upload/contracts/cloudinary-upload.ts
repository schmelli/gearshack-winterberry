/**
 * Cloudinary Upload API Contract
 *
 * Feature: 038-cloudinary-hybrid-upload
 * This file documents the expected API contract for Cloudinary uploads.
 * No actual API endpoints are created - this is a client-side integration.
 */

// =============================================================================
// Cloudinary REST API (External)
// =============================================================================

/**
 * Cloudinary Upload Endpoint
 *
 * POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
 *
 * Content-Type: multipart/form-data
 */

export interface CloudinaryUploadRequest {
  /** The file to upload (File, Blob, or base64 data URI) */
  file: File | Blob | string;

  /** Unsigned upload preset name (required for unsigned uploads) */
  upload_preset: string;

  /** Folder path in Cloudinary (e.g., "gearshack/users/{userId}/{itemId}") */
  folder?: string;

  /** Public ID for the asset (auto-generated if not provided) */
  public_id?: string;
}

export interface CloudinaryUploadResponse {
  /** Full CDN URL with HTTPS */
  secure_url: string;

  /** HTTP URL (prefer secure_url) */
  url: string;

  /** Unique identifier for the asset */
  public_id: string;

  /** Version number */
  version: number;

  /** Signature for verification */
  signature: string;

  /** Image width in pixels */
  width: number;

  /** Image height in pixels */
  height: number;

  /** File format (jpg, png, webp, gif) */
  format: string;

  /** Resource type */
  resource_type: 'image' | 'video' | 'raw';

  /** Upload timestamp ISO 8601 */
  created_at: string;

  /** File size in bytes */
  bytes: number;

  /** MIME type */
  type: string;

  /** Placeholder flag */
  placeholder: boolean;

  /** Original filename */
  original_filename: string;

  /** Folder path */
  folder: string;
}

export interface CloudinaryUploadError {
  error: {
    message: string;
  };
}

// =============================================================================
// Hook Contract (Internal)
// =============================================================================

/**
 * useCloudinaryUpload Hook Interface
 *
 * Provides upload functionality with progress tracking.
 */
export interface UseCloudinaryUploadReturn {
  /** Current upload status */
  status: 'idle' | 'processing' | 'uploading' | 'success' | 'error';

  /** Upload progress (0-100) during 'uploading' status */
  progress: number;

  /** Error message if status is 'error' */
  error: string | null;

  /** Upload result if status is 'success' */
  result: CloudinaryUploadResponse | null;

  /**
   * Upload a local file to Cloudinary
   * @param file - The file to upload
   * @param options - Upload options
   * @returns The secure URL on success, null on failure
   */
  uploadLocal: (
    file: File,
    options: {
      userId: string;
      itemId: string;
      removeBackground?: boolean;
    }
  ) => Promise<string | null>;

  /**
   * Handle result from Cloudinary Widget
   * @param result - Widget upload result
   * @returns The secure URL
   */
  handleWidgetResult: (result: CloudinaryUploadResponse) => string;

  /** Reset upload state to idle */
  reset: () => void;
}

// =============================================================================
// Widget Configuration Contract
// =============================================================================

/**
 * CldUploadWidget Options
 *
 * Configuration passed to next-cloudinary CldUploadWidget component.
 */
export interface CloudinaryWidgetOptions {
  /** Upload sources to enable */
  sources: ('local' | 'url' | 'unsplash' | 'camera')[];

  /** Folder path for uploads */
  folder: string;

  /** Maximum number of files */
  maxFiles: number;

  /** Resource type */
  resourceType: 'image' | 'video' | 'raw' | 'auto';

  /** Client-side allowed formats */
  clientAllowedFormats?: string[];

  /** Maximum file size in bytes */
  maxFileSize?: number;

  /** Show upload more button */
  showUploadMoreButton?: boolean;

  /** Widget styles */
  styles?: {
    palette?: {
      window?: string;
      windowBorder?: string;
      tabIcon?: string;
      menuIcons?: string;
      textDark?: string;
      textLight?: string;
      link?: string;
      action?: string;
      inactiveTabIcon?: string;
      error?: string;
      inProgress?: string;
      complete?: string;
      sourceBg?: string;
    };
  };
}
