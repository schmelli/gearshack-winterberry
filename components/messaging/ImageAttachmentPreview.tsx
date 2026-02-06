/**
 * ImageAttachmentPreview - Image Preview Before Sending
 *
 * Feature: 046-user-messaging-system
 * Task: T055
 *
 * Preview component for images before they are sent.
 */

'use client';

import Image from 'next/image';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageAttachmentPreviewProps {
  imageUrl: string;
  isUploading?: boolean;
  onRemove: () => void;
  className?: string;
}

/**
 * Shows a preview of an image attachment with remove option.
 */
export function ImageAttachmentPreview({
  imageUrl,
  isUploading = false,
  onRemove,
  className,
}: ImageAttachmentPreviewProps) {
  return (
    <div
      className={cn(
        'relative inline-block rounded-lg border bg-muted/50 p-1',
        className
      )}
    >
      {/* Image Preview */}
      <div className="relative h-20 w-20 overflow-hidden rounded-md">
        <Image
          src={imageUrl}
          alt="Attachment preview"
          fill
          className={cn(
            'object-cover transition-opacity',
            isUploading && 'opacity-50'
          )}
          unoptimized
        />

        {/* Upload Overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Remove Button */}
      {!isUploading && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove attachment</span>
        </Button>
      )}
    </div>
  );
}
