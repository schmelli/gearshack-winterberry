/**
 * Cloudinary Upload Utilities
 *
 * Feature: 046-user-messaging-system
 * Task: Code quality improvement
 *
 * Centralized utilities for uploading media to Cloudinary.
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.warn(
    'Cloudinary environment variables not configured. Image and voice uploads will fail.'
  );
}

export interface CloudinaryUploadResult {
  secure_url: string;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Uploads an image to Cloudinary.
 *
 * @param file - The image file to upload
 * @returns Upload result with secure URL and dimensions
 * @throws Error if upload fails or env vars are missing
 */
export async function uploadImageToCloudinary(
  file: File
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary configuration missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    // Try to extract error details from response body
    let errorDetails = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorDetails = errorData.error.message;
      }
    } catch {
      // JSON parsing failed, use status text
    }
    throw new Error(`Cloudinary upload failed: ${errorDetails}`);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new Error('Cloudinary upload failed: Invalid JSON response');
  }

  if (!data.secure_url || typeof data.secure_url !== 'string') {
    throw new Error('Cloudinary upload failed: No secure URL in response');
  }

  return {
    secure_url: data.secure_url,
    width: typeof data.width === 'number' ? data.width : undefined,
    height: typeof data.height === 'number' ? data.height : undefined,
  };
}

/**
 * Uploads a voice/audio message to Cloudinary.
 *
 * @param audioBlob - The audio blob to upload
 * @param filename - Optional filename (defaults to 'voice-message.webm')
 * @returns Upload result with secure URL and duration
 * @throws Error if upload fails or env vars are missing
 */
export async function uploadVoiceToCloudinary(
  audioBlob: Blob,
  filename = 'voice-message.webm'
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary configuration missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  const formData = new FormData();
  formData.append('file', audioBlob, filename);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio files

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    // Try to extract error details from response body
    let errorDetails = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorDetails = errorData.error.message;
      }
    } catch {
      // JSON parsing failed, use status text
    }
    throw new Error(`Cloudinary upload failed: ${errorDetails}`);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new Error('Cloudinary upload failed: Invalid JSON response');
  }

  if (!data.secure_url || typeof data.secure_url !== 'string') {
    throw new Error('Cloudinary upload failed: No secure URL in response');
  }

  return {
    secure_url: data.secure_url,
    duration: typeof data.duration === 'number' ? data.duration : undefined,
  };
}
