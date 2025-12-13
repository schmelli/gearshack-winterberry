/**
 * New Loadout Page - Enhanced Creation Form
 *
 * Feature: 047-loadout-creation-form
 * Tasks: T006-T021 (User Stories 1-5)
 *
 * Displays a 4-field form (Name, Description, Season, Activity Type)
 * to help users think through their trip basics before item selection.
 */

'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useLoadoutCreationForm } from '@/hooks/useLoadoutCreationForm';
import type { Season, ActivityType } from '@/types/loadout';
import { SEASONS, ACTIVITIES } from '@/lib/constants/loadout';

// =============================================================================
// Component
// =============================================================================

export default function NewLoadoutPage() {
  const t = useTranslations('LoadoutCreation');

  const {
    form,
    onSubmit,
    onCancel,
    isSubmitting,
    toggleSeason,
    toggleActivity,
    selectedSeasons,
    selectedActivities,
  } = useLoadoutCreationForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="container max-w-2xl py-8">
      {/* Back Link */}
      <Link
        href="/loadouts"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('cancelButton')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field (Required) - T007 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('nameLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('namePlaceholder')}
                {...register('name')}
                autoFocus
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {t('validation.nameRequired')}
                </p>
              )}
            </div>

            {/* Description Field (Optional) - T008 */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Textarea
                id="description"
                placeholder={t('descriptionPlaceholder')}
                {...register('description')}
                maxLength={500}
                rows={3}
                className="resize-none"
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {t('validation.descriptionTooLong')}
                </p>
              )}
            </div>

            {/* Season Selection - T011-T013, T020 */}
            <div className="space-y-2">
              <Label>{t('seasonLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((season) => (
                  <Badge
                    key={season}
                    variant={
                      selectedSeasons.includes(season) ? 'default' : 'outline'
                    }
                    className="cursor-pointer select-none px-3 py-1.5 text-sm transition-colors hover:bg-primary/80"
                    onClick={() => toggleSeason(season)}
                  >
                    {t(`seasons.${season}`)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Activity Type Selection - T014-T016, T021 */}
            <div className="space-y-2">
              <Label>{t('activityLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITIES.map((activity) => (
                  <Badge
                    key={activity}
                    variant={
                      selectedActivities.includes(activity)
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer select-none px-3 py-1.5 text-sm transition-colors hover:bg-primary/80"
                    onClick={() => toggleActivity(activity)}
                  >
                    {t(`activities.${activity}`)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Trip Date Field (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="tripDate">{t('tripDateLabel')}</Label>
              <Input id="tripDate" type="date" {...register('tripDate')} />
            </div>

            {/* Actions - T009, T017-T018 */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  'Creating...'
                ) : (
                  <>
                    {t('submitButton')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="w-full"
              >
                {t('cancelButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
