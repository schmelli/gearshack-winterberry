/**
 * Cloudinary URL Upload Contract
 *
 * Feature: 039-product-search-cloudinary
 * Purpose: Documents the contract for uploading external URLs to Cloudinary
 *
 * Note: No new API routes needed - this uses the existing Cloudinary REST API
 * via the unsigned upload preset configured in Feature 038.
 */

// =============================================================================
// Request Contract
// =============================================================================

/**
 * Cloudinary Upload Request (URL variant)
 *
 * Endpoint: https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
 * Method: POST
 * Content-Type: multipart/form-data
 */
export interface CloudinaryUrlUploadRequest {
  /** External URL to upload (Cloudinary fetches this server-side) */
  file: string; // URL string, not File
  /** Unsigned upload preset name */
  upload_preset: string;
  /** Folder path for organization */
  folder: string; // e.g., "gearshack/users/{userId}/{itemId}"
}

// =============================================================================
// Response Contract
// =============================================================================

/**
 * Cloudinary Upload Response
 *
 * Same response structure for both File and URL uploads.
 * See types/cloudinary.ts for CloudinaryUploadResult.
 */
export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  asset_id: string;
  original_filename: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

// =============================================================================
// Error Contract
// =============================================================================

export interface CloudinaryUploadError {
  error: {
    message: string;
  };
}

// =============================================================================
// Usage Example
// =============================================================================

/**
 * Example: Upload external URL to Cloudinary
 *
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', 'https://example.com/product-image.jpg');
 * formData.append('upload_preset', 'gearshack_web_uploads');
 * formData.append('folder', 'gearshack/users/user123/item456');
 *
 * const response = await fetch(
 *   'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload',
 *   { method: 'POST', body: formData }
 * );
 *
 * const result: CloudinaryUploadResponse = await response.json();
 * console.log(result.secure_url); // Cloudinary CDN URL
 * ```
 */
