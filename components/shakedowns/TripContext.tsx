/**
 * TripContext Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: ShakedownDetail.tsx
 *
 * Displays trip context including experience level and concerns.
 */

import { useTranslations } from 'next-intl';

import type { ExperienceLevel } from '@/types/shakedown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TripContextProps {
  experienceLevel: ExperienceLevel;
  concerns: string | null;
}

const EXPERIENCE_STYLES: Record<ExperienceLevel, string> = {
  beginner:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  intermediate:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  experienced:
    'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  expert:
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
};

export function TripContext({ experienceLevel, concerns }: TripContextProps): React.ReactElement {
  const t = useTranslations('Shakedowns');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Trip Context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">
              {t('experienceLevel')}
            </span>
            <Badge variant="outline" className={EXPERIENCE_STYLES[experienceLevel]}>
              {t(`experience.${experienceLevel}`)}
            </Badge>
          </div>
        </div>
        {concerns && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">{t('concerns')}</span>
            <div className="max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
              {concerns}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TripContext;
