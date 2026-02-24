/**
 * ImagePreview Component
 *
 * Feature: 001-gear-item-editor
 * Tasks: T039, T043
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays an image preview with loading state and error handling.
 * Shows a placeholder when URL is empty or image fails to load.
 */

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ImagePreviewProps {
  /** The image URL to preview */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Size Configuration
// =============================================================================

const SIZE_CLASSES = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
} as const;

// =============================================================================
// Helpers
// =============================================================================

/** Known image domains that are configured in next.config.ts remotePatterns */
const KNOWN_IMAGE_HOSTS = [
  'res.cloudinary.com',
  '.supabase.co',
  'lh3.googleusercontent.com',
  '.gstatic.com',
  '.ytimg.com',
  'img.youtube.com',
];

/**
 * Check if a URL is from a known/configured image domain.
 * External URLs not in this list need `unoptimized` to avoid Next.js Image errors.
 */
function isKnownImageHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return KNOWN_IMAGE_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(host)
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Component
// =============================================================================

export function ImagePreview({
  src,
  alt,
  size = 'md',
  className,
}: ImagePreviewProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // External URLs not in next.config.ts remotePatterns need unoptimized rendering
  const needsUnoptimized = src.startsWith('http') && !isKnownImageHost(src);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const sizeClass = SIZE_CLASSES[size];

  // No URL provided - show empty placeholder
  if (!src) {
    return (
      <div
        className={cn(
          sizeClass,
          'flex items-center justify-center rounded-md border border-dashed bg-muted',
          className
        )}
      >
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  // Error loading image - show error state
  if (hasError) {
    return (
      <div
        className={cn(
          sizeClass,
          'flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/10',
          className
        )}
      >
        <AlertCircle className="w-5 h-5 text-destructive mb-1" />
        <span className="text-xs text-destructive">Failed</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        'relative rounded-md border overflow-hidden bg-muted',
        className
      )}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      {/* Image */}
      <Image
        key={src} // Reset component when src changes
        src={src}
        alt={alt}
        fill
        unoptimized={needsUnoptimized}
        className={cn(
          'object-cover transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onError={handleError}
        onLoad={handleLoad}
        sizes="(max-width: 768px) 100vw, 400px"
      />
    </div>
  );
}
