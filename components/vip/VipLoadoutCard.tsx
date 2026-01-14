'use client';

/**
 * VIP Loadout Card Component
 *
 * Feature: 052-vip-loadouts
 * Task: T022
 *
 * Card component for displaying VIP loadout in lists.
 * Shows loadout name, source attribution, weight, and item count.
 */

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Backpack, Scale, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatWeightFromGrams } from '@/lib/utils/weight';
import { detectPlatform, getSourcePlatformLabel } from '@/lib/vip/source-url-validator';
import type { VipLoadoutSummary } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface VipLoadoutCardProps {
  loadout: VipLoadoutSummary;
  vipSlug: string;
  vipName?: string;
  showBookmark?: boolean;
  bookmarkButton?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function VipLoadoutCard({
  loadout,
  vipSlug,
  vipName,
  showBookmark = false,
  bookmarkButton,
}: VipLoadoutCardProps) {
  const locale = useLocale();
  const t = useTranslations('vip');

  /**
   * TECH DEBT: VipLoadoutSummary type migration in progress
   * - loadout.slug field pending schema migration from Feature 052
   * - sourceUrl structure may vary (sourceUrl vs source_attribution.url)
   * - Type assertions are temporary until VIP schema finalization
   * - Safe to use: both patterns are backwards compatible
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadoutSlug = (loadout as any).slug || loadout.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceUrl = (loadout as any).sourceUrl || (loadout as any).source_attribution?.url || '';

  const loadoutUrl = `/${locale}/vip/${vipSlug}/${loadoutSlug}`;
  const platform = detectPlatform(sourceUrl);

  return (
    <Card className="group h-full transition-all hover:shadow-lg hover:border-primary/50">
      <Link href={loadoutUrl}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary line-clamp-2">
                {loadout.name}
              </h3>
              {vipName && (
                <p className="text-sm text-muted-foreground mt-1">by {vipName}</p>
              )}
            </div>
            {showBookmark && bookmarkButton && (
              <div onClick={(e) => e.preventDefault()}>
                {bookmarkButton}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/**
           * TECH DEBT: activityTypes field from Feature 047 not yet in VipLoadoutSummary
           * - Legacy tripType field was removed in Feature 052
           * - activityTypes array support pending type definition update
           * - For now, stats (weight/items) provide sufficient loadout preview
           */}

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Scale className="h-4 w-4" />
              {formatWeightFromGrams(loadout.totalWeightGrams, 'g')}
            </span>
            <span className="flex items-center gap-1">
              <Backpack className="h-4 w-4" />
              {t('loadout.itemCount', { count: loadout.itemCount })}
            </span>
          </div>

          {/* Source Attribution */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {sourceUrl ? (
              <Badge variant="outline" className="text-xs gap-1">
                <ExternalLink className="h-3 w-3" />
                {getSourcePlatformLabel(platform)}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                {t('loadout.sourceUnavailable')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export default VipLoadoutCard;
