/**
 * LoadoutHeroActions Component
 *
 * Feature: 006-ui-makeover, 048-ai-loadout-image-gen
 *
 * Action buttons for the loadout hero section overlay.
 */

'use client';

import { Pencil, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { LoadoutShareButton } from '@/components/loadouts/LoadoutShareButton';
import { CompareToVipButton } from '@/components/loadouts/CompareToVipButton';
import { LoadoutExportMenu } from '@/components/loadouts/LoadoutExportMenu';
import type { Loadout, LoadoutItemState, Season, ActivityType } from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import { ACTIVITY_TYPE_LABELS, SEASON_LABELS } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutHeroActionsProps {
  loadout: Loadout;
  items: GearItem[];
  itemStates: LoadoutItemState[];
  activityTypes: ActivityType[];
  seasons: Season[];
  totalWeight: number;
  baseWeight: number;
  userId: string | null;
  onEditClick: () => void;
}

// =============================================================================
// Action Buttons Style
// =============================================================================

const heroButtonClass = 'h-9 w-9 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30';

// =============================================================================
// Component
// =============================================================================

export function LoadoutHeroActionButtons({
  loadout,
  items,
  itemStates,
  activityTypes,
  seasons,
  totalWeight,
  baseWeight,
  userId,
  onEditClick,
}: LoadoutHeroActionsProps) {
  const tShakedowns = useTranslations('Shakedowns');

  return (
    <>
      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onEditClick}
        className={heroButtonClass}
        aria-label={tShakedowns('ariaLabels.editLoadoutMetadata')}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Share Button */}
      <LoadoutShareButton
        loadout={loadout}
        items={items}
        itemStates={itemStates}
        activityTypes={activityTypes}
        seasons={seasons}
        variant="ghost"
        size="icon"
        showLabel={false}
        className={heroButtonClass}
      />

      {/* Export Menu */}
      <LoadoutExportMenu
        loadout={loadout}
        items={items}
        itemStates={itemStates}
        activityTypes={activityTypes}
        seasons={seasons}
        totalWeight={totalWeight}
        baseWeight={baseWeight}
        iconOnly
        className={heroButtonClass}
      />

      {/* Compare to VIP */}
      {userId && (
        <CompareToVipButton
          loadoutId={loadout.id}
          variant="ghost"
          size="icon"
          className={heroButtonClass}
        />
      )}

      {/* Request Shakedown */}
      {userId && (
        <Button
          variant="ghost"
          size="icon"
          className={heroButtonClass}
          aria-label={tShakedowns('actions.requestShakedown')}
          asChild
        >
          <Link href={`/community/shakedowns/new?loadoutId=${loadout.id}`}>
            <Users className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </>
  );
}

// =============================================================================
// Badges Component
// =============================================================================

export interface LoadoutHeroBadgesProps {
  activityTypes: ActivityType[];
  seasons: Season[];
}

export function LoadoutHeroBadges({ activityTypes, seasons }: LoadoutHeroBadgesProps) {
  return (
    <>
      {activityTypes.map((activity) => (
        <Badge
          key={activity}
          variant="secondary"
          className="bg-white/20 text-white backdrop-blur-sm"
        >
          {ACTIVITY_TYPE_LABELS[activity]}
        </Badge>
      ))}
      {seasons.map((season) => (
        <Badge
          key={season}
          variant="secondary"
          className="bg-white/20 text-white backdrop-blur-sm"
        >
          {SEASON_LABELS[season]}
        </Badge>
      ))}
    </>
  );
}
