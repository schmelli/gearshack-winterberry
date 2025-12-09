/**
 * Cloudinary Types
 * Feature: 038-cloudinary-hybrid-upload
 */

/** Configuration for Cloudinary integration */
export interface CloudinaryConfig {
  /** Cloudinary cloud name (from dashboard) */
  cloudName: string;
  /** Unsigned upload preset name */
  uploadPreset: string;
}

/** Response from Cloudinary after successful upload */
export interface CloudinaryUploadResult {
  /** Full CDN URL with HTTPS */
  secure_url: string;
  /** Unique identifier for the asset */
  public_id: string;
  /** Original filename */
  original_filename: string;
  /** File format (jpg, png, etc.) */
  format: string;
  /** File size in bytes */
  bytes: number;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Resource type (image, video, raw) */
  resource_type: 'image' | 'video' | 'raw';
  /** Upload timestamp */
  created_at: string;
  /** Folder path in Cloudinary */
  folder: string;
}

/** Upload status for state machine */
export type CloudinaryUploadStatus =
  | 'idle'
  | 'processing'  // WASM background removal
  | 'uploading'   // Cloudinary upload
  | 'success'
  | 'error';

/** Status for product image search operations */
export type ProductSearchStatus = 'idle' | 'searching' | 'error';

/** State for upload progress tracking */
export interface CloudinaryUploadState {
  status: CloudinaryUploadStatus;
  progress?: number;  // 0-100 for upload progress
  error?: string;
  result?: CloudinaryUploadResult;
}

/** Discriminated union for upload pipeline types */
export type UploadPipeline =
  | { type: 'local'; removeBackground: boolean }
  | { type: 'cloud'; source: 'unsplash' | 'url' | 'local' };
