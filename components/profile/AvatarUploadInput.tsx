/**
 * AvatarUploadInput Component
 *
 * Feature: 041-loadout-ux-profile
 * Task: T013
 *
 * Allows users to upload a custom profile avatar with fallback chain display.
 * Fallback: Custom avatar > Provider avatar > Initials
 */

'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { getDisplayAvatarUrl, getUserInitials, getAvatarSource } from '@/lib/utils/avatar';

// =============================================================================
// Types
// =============================================================================

export interface AvatarUploadInputProps {
  /** Current custom avatar URL */
  value: string | null;
  /** Provider avatar URL for fallback display */
  providerAvatarUrl: string | null;
  /** User display name for initials fallback */
  displayName: string | null;
  /** User ID for Cloudinary folder */
  userId: string;
  /** Callback when avatar URL changes */
  onChange: (url: string | null) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// =============================================================================
// Component
// =============================================================================

export function AvatarUploadInput({
  value,
  providerAvatarUrl,
  displayName,
  userId,
  onChange,
  disabled = false,
}: AvatarUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { uploadLocal, status, progress, reset } = useCloudinaryUpload();

  // Compute display values
  const displayUrl = getDisplayAvatarUrl(value, providerAvatarUrl);
  const initials = getUserInitials(displayName);
  const avatarSource = getAvatarSource(value, providerAvatarUrl);
  const isUploading = status === 'processing' || status === 'uploading';

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return; // Hook will show error toast
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return; // Hook will show error toast
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload to Cloudinary (no background removal for avatars)
    const secureUrl = await uploadLocal(file, {
      userId,
      itemId: 'avatar',
      removeBackground: false,
    });

    // Clean up preview
    URL.revokeObjectURL(objectUrl);
    setPreviewUrl(null);

    if (secureUrl) {
      onChange(secureUrl);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle click on upload button
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle remove avatar
  const handleRemove = () => {
    reset();
    onChange(null);
  };

  // Current display URL (preview during upload, otherwise the avatar)
  const currentDisplayUrl = previewUrl || displayUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          {currentDisplayUrl ? (
            <AvatarImage asChild src={currentDisplayUrl}>
              <Image
                src={currentDisplayUrl}
                alt={displayName || 'Profile avatar'}
                width={96}
                height={96}
                className="object-cover"
                unoptimized
              />
            </AvatarImage>
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
            {initials || <User className="h-10 w-10" />}
          </AvatarFallback>
        </Avatar>

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-xs text-white">{progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Source indicator */}
      <p className="text-xs text-muted-foreground">
        {avatarSource === 'custom' && 'Custom avatar'}
        {avatarSource === 'provider' && 'Google account photo'}
        {avatarSource === 'initials' && 'No photo set'}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
        >
          <Camera className="mr-2 h-4 w-4" />
          {value ? 'Change photo' : 'Upload photo'}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || isUploading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG or WebP. Max {MAX_FILE_SIZE_MB}MB.
      </p>
    </div>
  );
}
