/**
 * Style Preferences Form Component
 * Feature: 048-ai-loadout-image-gen (Phase 5 - US3)
 * Constitution: Stateless component - receives style data and onChange callback
 */

'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { StylePreferences } from '@/types/loadout-image';
import { cn } from '@/lib/utils';

export interface StylePreferencesFormProps {
  /** Current style preferences */
  stylePreferences: StylePreferences;

  /** Callback when preferences change */
  onChange: (preferences: StylePreferences) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Form component for advanced style preferences
 * Allows users to customize image generation with templates, lighting, and atmosphere
 */
export function StylePreferencesForm({
  stylePreferences,
  onChange,
  className,
}: StylePreferencesFormProps) {
  const t = useTranslations('Loadouts.stylePreferences');

  const handleTemplateChange = (value: string) => {
    onChange({
      ...stylePreferences,
      template: value as StylePreferences['template'],
    });
  };

  const handleTimeOfDayChange = (value: string) => {
    onChange({
      ...stylePreferences,
      timeOfDay: value as StylePreferences['timeOfDay'],
    });
  };

  const handleAtmosphereChange = (value: string) => {
    onChange({
      ...stylePreferences,
      atmosphere: value || undefined,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Template Selector */}
      <div className="space-y-2">
        <Label htmlFor="template">{t('visualStyle')}</Label>
        <Select
          value={stylePreferences.template || ''}
          onValueChange={handleTemplateChange}
        >
          <SelectTrigger id="template">
            <SelectValue placeholder={t('selectStyle')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('templates.default')}</SelectItem>
            <SelectItem value="cinematic">
              <div>
                <div className="font-medium">{t('templates.cinematic.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('templates.cinematic.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="documentary">
              <div>
                <div className="font-medium">{t('templates.documentary.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('templates.documentary.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="magazine">
              <div>
                <div className="font-medium">{t('templates.magazine.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('templates.magazine.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="instagram">
              <div>
                <div className="font-medium">{t('templates.instagram.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('templates.instagram.description')}
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time of Day Selector */}
      <div className="space-y-2">
        <Label htmlFor="timeOfDay">{t('lightingTimeOfDay')}</Label>
        <Select
          value={stylePreferences.timeOfDay || ''}
          onValueChange={handleTimeOfDayChange}
        >
          <SelectTrigger id="timeOfDay">
            <SelectValue placeholder={t('selectLighting')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('timeOfDay.default')}</SelectItem>
            <SelectItem value="golden_hour">
              <div>
                <div className="font-medium">{t('timeOfDay.goldenHour.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('timeOfDay.goldenHour.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="blue_hour">
              <div>
                <div className="font-medium">{t('timeOfDay.blueHour.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('timeOfDay.blueHour.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="midday">
              <div>
                <div className="font-medium">{t('timeOfDay.midday.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('timeOfDay.midday.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="dawn">
              <div>
                <div className="font-medium">{t('timeOfDay.dawn.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('timeOfDay.dawn.description')}
                </div>
              </div>
            </SelectItem>
            <SelectItem value="dusk">
              <div>
                <div className="font-medium">{t('timeOfDay.dusk.name')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('timeOfDay.dusk.description')}
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Atmosphere Text Input */}
      <div className="space-y-2">
        <Label htmlFor="atmosphere">{t('atmosphereOptional')}</Label>
        <Input
          id="atmosphere"
          type="text"
          placeholder={t('atmospherePlaceholder')}
          value={stylePreferences.atmosphere || ''}
          onChange={(e) => handleAtmosphereChange(e.target.value)}
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          {t('atmosphereHint')}
        </p>
      </div>
    </div>
  );
}
