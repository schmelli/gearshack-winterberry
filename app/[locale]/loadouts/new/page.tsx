/**
 * New Loadout Page
 *
 * Feature: 005-loadout-management
 * Feature: 031-search-save-i18n-fix
 * FR-024: Allow users to set loadout name, description, trip date, seasons, and activity types
 */

'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleBadge } from '@/components/ui/toggle-badge';
import { useSupabaseStore as useStore } from '@/hooks/useSupabaseStore';
import { loadoutFormSchema } from '@/lib/validations/loadout-schema';
import type { ActivityType, Season } from '@/types/loadout';

const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];
const ACTIVITY_TYPES: ActivityType[] = ['hiking', 'camping', 'climbing', 'skiing', 'backpacking'];

export default function NewLoadoutPage() {
  const router = useRouter();
  const t = useTranslations('Loadouts');
  const createLoadout = useStore((state) => state.createLoadout);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<ActivityType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSeason = (season: Season) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
  };

  const toggleActivityType = (activityType: ActivityType) => {
    setSelectedActivityTypes((prev) =>
      prev.includes(activityType) ? prev.filter((a) => a !== activityType) : [...prev, activityType]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate with Zod
      const result = loadoutFormSchema.safeParse({
        name,
        description,
        tripDate,
        activityTypes: selectedActivityTypes,
        seasons: selectedSeasons,
      });

      if (!result.success) {
        // Zod 4 uses issues array
        const firstIssue = result.error.issues[0];
        setError(firstIssue?.message ?? 'Validation failed');
        setIsSubmitting(false);
        return;
      }

      // Create loadout in store (now async)
      const loadoutId = await createLoadout(
        result.data.name,
        result.data.tripDate,
        result.data.description,
        result.data.activityTypes as ActivityType[],
        result.data.seasons as Season[]
      );

      // Redirect to editor
      router.push(`/loadouts/${loadoutId}`);
    } catch {
      setError('Failed to create loadout');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      {/* Back Link */}
      <Link
        href="/loadouts"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('newLoadout.backToLoadouts')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('newLoadout.title')}</CardTitle>
          <CardDescription>{t('newLoadout.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('newLoadout.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('newLoadout.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('newLoadout.descriptionLabel')}</Label>
              <Textarea
                id="description"
                placeholder={t('newLoadout.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Trip Date Field */}
            <div className="space-y-2">
              <Label htmlFor="tripDate">{t('newLoadout.tripDateLabel')}</Label>
              <Input
                id="tripDate"
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
              />
            </div>

            {/* Seasons Selection */}
            <div className="space-y-2">
              <Label>{t('newLoadout.seasonsLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((season) => (
                  <ToggleBadge
                    key={season}
                    label={t(`seasons.${season}`)}
                    pressed={selectedSeasons.includes(season)}
                    onPressedChange={() => toggleSeason(season)}
                  />
                ))}
              </div>
            </div>

            {/* Activity Types Selection */}
            <div className="space-y-2">
              <Label>{t('newLoadout.activityTypesLabel')}</Label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map((activityType) => (
                  <ToggleBadge
                    key={activityType}
                    label={t(`activityTypes.${activityType}`)}
                    pressed={selectedActivityTypes.includes(activityType)}
                    onPressedChange={() => toggleActivityType(activityType)}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('newLoadout.creatingButton') : t('newLoadout.createButton')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/loadouts">{t('newLoadout.cancelButton')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
