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
            <SelectItem value="">Default (Natural)</SelectItem>
            <SelectItem value="cinematic">
              <div>
                <div className="font-medium">Cinematic</div>
                <div className="text-xs text-muted-foreground">
                  Dramatic, wide-angle, movie-like
                </div>
              </div>
            </SelectItem>
            <SelectItem value="documentary">
              <div>
                <div className="font-medium">Documentary</div>
                <div className="text-xs text-muted-foreground">
                  Natural, realistic, photojournalistic
                </div>
              </div>
            </SelectItem>
            <SelectItem value="magazine">
              <div>
                <div className="font-medium">Magazine</div>
                <div className="text-xs text-muted-foreground">
                  Polished, editorial, striking
                </div>
              </div>
            </SelectItem>
            <SelectItem value="instagram">
              <div>
                <div className="font-medium">Instagram</div>
                <div className="text-xs text-muted-foreground">
                  Vibrant, trendy, social media
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
            <SelectItem value="">Default (Season-based)</SelectItem>
            <SelectItem value="golden_hour">
              <div>
                <div className="font-medium">Golden Hour</div>
                <div className="text-xs text-muted-foreground">
                  Warm, low-angle sun
                </div>
              </div>
            </SelectItem>
            <SelectItem value="blue_hour">
              <div>
                <div className="font-medium">Blue Hour</div>
                <div className="text-xs text-muted-foreground">
                  Twilight, cool tones
                </div>
              </div>
            </SelectItem>
            <SelectItem value="midday">
              <div>
                <div className="font-medium">Midday</div>
                <div className="text-xs text-muted-foreground">
                  Bright, high contrast
                </div>
              </div>
            </SelectItem>
            <SelectItem value="dawn">
              <div>
                <div className="font-medium">Dawn</div>
                <div className="text-xs text-muted-foreground">
                  Early morning, soft
                </div>
              </div>
            </SelectItem>
            <SelectItem value="dusk">
              <div>
                <div className="font-medium">Dusk</div>
                <div className="text-xs text-muted-foreground">
                  Sunset, fading light
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
