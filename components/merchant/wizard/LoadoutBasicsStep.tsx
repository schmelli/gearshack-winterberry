/**
 * LoadoutBasicsStep Component
 *
 * Feature: 053-merchant-integration
 * Task: T034
 *
 * First step of the loadout creation wizard.
 * Captures: name, description, trip type, and seasons.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { MerchantLoadoutInput } from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutBasicsStepProps {
  /** Current values */
  values: MerchantLoadoutInput;
  /** Callback to update values */
  onUpdate: (updates: Partial<MerchantLoadoutInput>) => void;
  /** Available trip types */
  tripTypes?: TripTypeOption[];
  /** Available seasons */
  seasons?: SeasonOption[];
}

export interface TripTypeOption {
  value: string;
  label: string;
}

export interface SeasonOption {
  value: string;
  label: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TRIP_TYPES: TripTypeOption[] = [
  { value: 'day-hike', label: 'Day Hike' },
  { value: 'overnight', label: 'Overnight Backpacking' },
  { value: 'multi-day', label: 'Multi-Day Trek' },
  { value: 'ultralight', label: 'Ultralight' },
  { value: 'camping', label: 'Car Camping' },
  { value: 'mountaineering', label: 'Mountaineering' },
  { value: 'trail-running', label: 'Trail Running' },
  { value: 'bikepacking', label: 'Bikepacking' },
  { value: 'kayaking', label: 'Kayaking/Paddling' },
  { value: 'winter', label: 'Winter Expedition' },
];

const DEFAULT_SEASONS: SeasonOption[] = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
];

// =============================================================================
// Component
// =============================================================================

export function LoadoutBasicsStep({
  values,
  onUpdate,
  tripTypes = DEFAULT_TRIP_TYPES,
  seasons = DEFAULT_SEASONS,
}: LoadoutBasicsStepProps) {
  const t = useTranslations('MerchantLoadouts.wizard.basics');

  // Handle season toggle
  const handleSeasonToggle = (season: string, checked: boolean) => {
    const currentSeasons = values.season ?? [];
    if (checked) {
      onUpdate({ season: [...currentSeasons, season] });
    } else {
      onUpdate({ season: currentSeasons.filter((s) => s !== season) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Loadout Name */}
      <div className="space-y-2">
        <Label htmlFor="loadout-name" className="text-sm font-medium">
          {t('name')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="loadout-name"
          value={values.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={t('namePlaceholder')}
          className="max-w-lg"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">{t('nameHelp')}</p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="loadout-description" className="text-sm font-medium">
          {t('description')}
        </Label>
        <Textarea
          id="loadout-description"
          value={values.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder={t('descriptionPlaceholder')}
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">{t('descriptionHelp')}</p>
      </div>

      {/* Trip Type */}
      <div className="space-y-2">
        <Label htmlFor="loadout-trip-type" className="text-sm font-medium">
          {t('tripType')}
        </Label>
        <Select
          value={values.tripType ?? ''}
          onValueChange={(value) => onUpdate({ tripType: value })}
        >
          <SelectTrigger id="loadout-trip-type" className="max-w-xs">
            <SelectValue placeholder={t('tripTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {tripTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seasons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('season')}</Label>
        <div className="flex flex-wrap gap-4">
          {seasons.map((season) => (
            <div key={season.value} className="flex items-center space-x-2">
              <Checkbox
                id={`season-${season.value}`}
                checked={(values.season ?? []).includes(season.value)}
                onCheckedChange={(checked) =>
                  handleSeasonToggle(season.value, !!checked)
                }
              />
              <Label
                htmlFor={`season-${season.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {season.label}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('seasonHelp')}</p>
      </div>
    </div>
  );
}

export default LoadoutBasicsStep;
