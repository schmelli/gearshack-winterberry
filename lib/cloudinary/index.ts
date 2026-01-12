/**
 * Cloudinary Utilities - Barrel Export
 *
 * Centralized exports for all Cloudinary-related utilities.
 *
 * Usage:
 * import { getCloudinaryConfig, validateImageFile } from '@/lib/cloudinary';
 */

// Configuration
export {
  getCloudinaryConfig,
  getCloudinaryUploadUrl,
} from './config';

// Validation
export {
  validateImageFile,
  isAcceptedImageType,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ACCEPTED_IMAGE_TYPES,
  type AcceptedImageType,
} from './validation';
