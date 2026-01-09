'use client';

/**
 * YouTube Preview Component
 *
 * Feature: 051-community-bulletin-board (Enhancement)
 *
 * Displays a YouTube video preview with thumbnail and metadata
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Play, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';

interface YouTubePreviewProps {
  videoId: string;
  url: string;
}

interface VideoMetadata {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export function YouTubePreview({ videoId, url }: YouTubePreviewProps) {
  const _t = useTranslations('bulletin');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        // Use YouTube oEmbed API to fetch metadata
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );

        if (!response.ok) throw new Error('Failed to fetch metadata');

        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error('Failed to fetch YouTube metadata:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [videoId]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          <Skeleton className="h-full w-full" />
        </AspectRatio>
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </Card>
    );
  }

  if (error || !metadata) {
    // Fallback: just show the link
    return (
      <Card className="p-3 bg-muted/50">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Play className="h-4 w-4" />
          <span className="line-clamp-1">{url}</span>
          <ExternalLink className="h-3 w-3 ml-auto flex-shrink-0" />
        </a>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow max-h-[300px]">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <AspectRatio ratio={16 / 9} className="relative bg-muted">
          <img
            src={metadata.thumbnail_url}
            alt={metadata.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </div>
        </AspectRatio>
        <div className="p-3 bg-background">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{metadata.title}</h4>
          <p className="text-xs text-muted-foreground">{metadata.author_name}</p>
        </div>
      </a>
    </Card>
  );
}
