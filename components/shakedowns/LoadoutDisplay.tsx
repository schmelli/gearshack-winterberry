/**
 * LoadoutDisplay Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: ShakedownDetail.tsx
 *
 * Displays the loadout associated with a shakedown, including gear items grid.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, MessageSquare, Package, Scale } from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import type { Loadout } from '@/types/loadout';
import type { ShakedownGearItem } from '@/hooks/shakedowns';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface SelectedGearItem {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
}

interface LoadoutDisplayProps {
  loadout: Loadout;
  loadoutName: string;
  totalWeightGrams: number;
  itemCount: number;
  gearItems: ShakedownGearItem[];
  feedbackTree: FeedbackNode[];
  onItemClick: (item: SelectedGearItem) => void;
}

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

export function LoadoutDisplay({
  loadout,
  loadoutName,
  totalWeightGrams,
  itemCount,
  gearItems,
  feedbackTree,
  onItemClick,
}: LoadoutDisplayProps): React.ReactElement {
  const t = useTranslations('Shakedowns.detail');

  const itemFeedbackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    feedbackTree.forEach((feedback) => {
      if (feedback.gearItemId) {
        counts[feedback.gearItemId] = (counts[feedback.gearItemId] || 0) + 1;
      }
    });
    return counts;
  }, [feedbackTree]);

  const handleItemClick = useCallback(
    (item: ShakedownGearItem) => {
      onItemClick({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.productTypeId,
        weight: item.weightGrams,
        imageUrl: item.imageUrl,
      });
    },
    [onItemClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: ShakedownGearItem) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleItemClick(item);
      }
    },
    [handleItemClick]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('loadoutInfo')}</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href={`/loadouts/${loadout.id}`}>
              {t('viewLoadout')}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <CardDescription>{loadoutName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weight and item count summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="rounded-full bg-forest-100 p-2 dark:bg-forest-900/30">
              <Scale className="size-5 text-forest-600 dark:text-forest-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalWeight')}</p>
              <p className="font-semibold">{formatWeight(totalWeightGrams)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="rounded-full bg-terracotta-100 p-2 dark:bg-terracotta-900/30">
              <Package className="size-5 text-terracotta-600 dark:text-terracotta-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-semibold">{t('itemCount', { count: itemCount })}</p>
            </div>
          </div>
        </div>

        {/* Activity types and seasons */}
        {((loadout.activityTypes && loadout.activityTypes.length > 0) ||
          (loadout.seasons && loadout.seasons.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {loadout.activityTypes?.map((activity) => (
              <Badge key={activity} variant="secondary" className="text-xs">
                {activity}
              </Badge>
            ))}
            {loadout.seasons?.map((season) => (
              <Badge key={season} variant="outline" className="text-xs">
                {season}
              </Badge>
            ))}
          </div>
        )}

        {/* Gear Items Grid */}
        {gearItems.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {t('clickToFeedback')}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {gearItems.map((item) => {
                  const feedbackCount = itemFeedbackCounts[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleItemClick(item)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg border p-3',
                        'cursor-pointer transition-colors',
                        'hover:bg-muted/50 hover:border-primary/30',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                      )}
                    >
                      <Avatar className="size-10 rounded-md shrink-0">
                        {item.imageUrl ? (
                          <AvatarImage
                            src={item.imageUrl}
                            alt={item.name}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-md bg-muted">
                          <Package className="size-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.brand && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.brand}
                          </p>
                        )}
                        {item.weightGrams !== null && (
                          <p className="text-xs text-muted-foreground">
                            {formatWeight(item.weightGrams)}
                          </p>
                        )}
                      </div>

                      {feedbackCount > 0 && (
                        <div
                          className="absolute -top-1 -right-1 flex items-center justify-center
                            size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                          title={`${feedbackCount} feedback${feedbackCount !== 1 ? 's' : ''}`}
                        >
                          {feedbackCount}
                        </div>
                      )}

                      <MessageSquare
                        className="size-4 text-muted-foreground/50 shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LoadoutDisplay;
