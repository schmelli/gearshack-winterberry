/**
 * VIP Featured Videos Component
 *
 * Feature: 056-community-hub-enhancements
 * Task: T051
 *
 * Displays featured YouTube videos in a grid.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Play, Video } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

// ============================================================================
// Types
// ============================================================================

interface VipFeaturedVideosProps {
  videos: string[];
  maxVideos?: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ============================================================================
// Component
// ============================================================================

export function VipFeaturedVideos({
  videos,
  maxVideos = 6,
}: VipFeaturedVideosProps) {
  const t = useTranslations('vip');

  const validVideos = useMemo(() => {
    return videos
      .map((url) => ({
        url,
        id: extractYouTubeId(url),
      }))
      .filter((v) => v.id !== null)
      .slice(0, maxVideos) as Array<{ url: string; id: string }>;
  }, [videos, maxVideos]);

  if (validVideos.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
        <Video className="h-5 w-5" />
        {t('profile.featuredVideos')}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {validVideos.map((video) => (
          <a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg"
          >
            <AspectRatio ratio={16 / 9}>
              <Image
                src={getYouTubeThumbnail(video.id)}
                alt="Video thumbnail"
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                unoptimized
              />
            </AspectRatio>

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-transform group-hover:scale-110">
                <Play className="h-6 w-6 fill-current" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
