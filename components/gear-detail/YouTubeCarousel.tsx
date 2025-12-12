/**
 * YouTube Carousel Component
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T036-T041
 *
 * Horizontal scroll carousel displaying YouTube product review videos.
 * Shows thumbnails with title and channel name, opens YouTube on click.
 */

'use client';

import Image from 'next/image';
import { Play, RotateCcw, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { YouTubeVideo } from '@/types/youtube';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface YouTubeCarouselProps {
  /** Array of YouTube videos (null = loading) */
  videos: YouTubeVideo[] | null;
  /** Whether videos are loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Callback to retry fetch */
  onRetry?: () => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function YouTubeCarousel({
  videos,
  isLoading,
  error,
  onRetry,
  className,
}: YouTubeCarouselProps) {
  // T039: Loading skeleton state
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-48 shrink-0 space-y-2">
              <Skeleton className="aspect-video w-full rounded-md" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // T041: Error state with retry button
  if (error) {
    return (
      <div className={cn('rounded-lg border border-dashed p-4 text-center', className)}>
        <Youtube className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>
            <RotateCcw className="mr-2 h-3 w-3" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  // T040: Empty state when no videos found
  if (!videos || videos.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed p-4 text-center', className)}>
        <Youtube className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No reviews found for this product
        </p>
      </div>
    );
  }

  // T036, T037, T038: Carousel with video cards
  return (
    <div
      className={cn(
        'flex gap-3 overflow-x-auto pb-3',
        // Custom scrollbar styling
        '[&::-webkit-scrollbar]:h-2',
        '[&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-muted/50',
        '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30',
        '[&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50',
        className
      )}
    >
      {videos.map((video) => (
        <VideoCard key={video.videoId} video={video} />
      ))}
    </div>
  );
}

// =============================================================================
// Video Card Sub-Component
// =============================================================================

interface VideoCardProps {
  video: YouTubeVideo;
}

function VideoCard({ video }: VideoCardProps) {
  // T038: Click-to-YouTube (opens video in new tab)
  const handleClick = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group w-48 shrink-0 cursor-pointer rounded-lg border bg-card p-2 text-left',
        'transition-colors hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* T037: Video thumbnail with play icon overlay */}
      <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
        <Image
          src={video.thumbnailUrl}
          alt={video.title}
          fill
          unoptimized
          className="object-cover transition-transform group-hover:scale-105"
          sizes="192px"
        />
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
      </div>

      {/* T037: Title and channel name */}
      <div className="mt-2 space-y-1">
        <p className="line-clamp-2 text-xs font-medium leading-tight">
          {video.title}
        </p>
        <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
      </div>
    </button>
  );
}

export default YouTubeCarousel;
