'use client';

/**
 * Linked Content Preview Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T049
 *
 * Card preview with thumbnail, title, and stats for linked loadouts/shakedowns.
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Package, Scale, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import type { LinkedContentType } from '@/types/bulletin';

interface LinkedContentData {
  id: string;
  title: string;
  thumbnail?: string | null;
  baseWeight?: number;
  itemCount?: number;
}

interface LinkedContentPreviewProps {
  contentType: LinkedContentType;
  contentId: string;
}

export function LinkedContentPreview({
  contentType,
  contentId,
}: LinkedContentPreviewProps) {
  const t = useTranslations('bulletin');
  const supabase = createClient();

  const [data, setData] = useState<LinkedContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContentData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (contentType === 'loadout' || contentType === 'shakedown') {
          const { data: loadout, error: err } = await supabase
            .from('loadouts')
            .select('id, name, hero_image_url, base_weight_g')
            .eq('id', contentId)
            .single();

          if (err) throw err;

          // Get item count
          const { count } = await supabase
            .from('loadout_items')
            .select('*', { count: 'exact', head: true })
            .eq('loadout_id', contentId);

          setData({
            id: loadout.id,
            title: loadout.name,
            thumbnail: loadout.hero_image_url,
            baseWeight: loadout.base_weight_g,
            itemCount: count ?? 0,
          });
        }
        // TODO: Add marketplace_item support when needed
      } catch {
        setError(t('linkedContent.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchContentData();
  }, [contentType, contentId, supabase, t]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex gap-4 p-4">
          <Skeleton className="h-20 w-20 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-sm text-destructive">
            {error ?? t('linkedContent.notFound')}
          </span>
        </CardContent>
      </Card>
    );
  }

  const typeLabel = t(`linkedContent.${contentType}`);
  const weightLabel = data.baseWeight
    ? t('linkedContent.baseWeight', {
        weight: formatWeight(data.baseWeight),
      })
    : null;
  const itemsLabel = data.itemCount
    ? t('linkedContent.items', { count: data.itemCount })
    : null;

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      <CardContent className="flex gap-4 p-4">
        {/* Thumbnail */}
        {data.thumbnail ? (
          <img
            src={data.thumbnail}
            alt={data.title}
            className="h-20 w-20 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {typeLabel}
            </p>
            <h4 className="font-semibold truncate">{data.title}</h4>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {weightLabel && (
              <span className="flex items-center gap-1">
                <Scale className="h-3 w-3" />
                {weightLabel}
              </span>
            )}
            {itemsLabel && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {itemsLabel}
              </span>
            )}
          </div>
        </div>

        {/* View button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          asChild
        >
          <a
            href={`/loadouts/${data.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}
