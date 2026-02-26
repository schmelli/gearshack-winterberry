/**
 * useLoadoutCreationForm - Form Logic Hook for Enhanced Loadout Creation
 *
 * Feature: 047-loadout-creation-form
 * Task: T005
 *
 * Provides form state management, validation, and submission logic
 * for the enhanced loadout creation form with 4 fields.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useSupabaseStore } from '@/hooks/useSupabaseStore';
import {
  loadoutCreationFormSchema,
  type LoadoutCreationFormInput,
} from '@/lib/validations/loadout-schema';
import type { Season, ActivityType } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

export interface UseLoadoutCreationFormReturn {
  /** React Hook Form instance */
  form: ReturnType<typeof useForm<LoadoutCreationFormInput>>;
  /** Form submission handler */
  onSubmit: (data: LoadoutCreationFormInput) => Promise<void>;
  /** Cancel handler - navigates back to loadouts list */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Toggle a season in the selection */
  toggleSeason: (season: Season) => void;
  /** Toggle an activity type in the selection */
  toggleActivity: (activity: ActivityType) => void;
  /** Currently selected seasons */
  selectedSeasons: Season[];
  /** Currently selected activity types */
  selectedActivities: ActivityType[];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutCreationForm(): UseLoadoutCreationFormReturn {
  const router = useRouter();
  const createLoadout = useSupabaseStore((state) => state.createLoadout);

  const form = useForm<LoadoutCreationFormInput>({
    resolver: zodResolver(loadoutCreationFormSchema),
    defaultValues: {
      name: '',
      tripDate: '',
      description: '',
      seasons: [],
      activityTypes: [],
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch is a known pattern
  const watchedSeasons = form.watch('seasons');
  const watchedActivities = form.watch('activityTypes');
  const selectedSeasons = watchedSeasons ?? [];
  const selectedActivities = watchedActivities ?? [];

  const toggleSeason = (season: Season) => {
    const current = form.getValues('seasons') ?? [];
    if (current.includes(season)) {
      form.setValue(
        'seasons',
        current.filter((s) => s !== season),
        { shouldValidate: true }
      );
    } else {
      form.setValue('seasons', [...current, season], { shouldValidate: true });
    }
  };

  const toggleActivity = (activity: ActivityType) => {
    const current = form.getValues('activityTypes') ?? [];
    if (current.includes(activity)) {
      form.setValue(
        'activityTypes',
        current.filter((a) => a !== activity),
        { shouldValidate: true }
      );
    } else {
      form.setValue('activityTypes', [...current, activity], {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = async (data: LoadoutCreationFormInput) => {
    try {
      // Parse the validated data
      const parsed = loadoutCreationFormSchema.parse(data);

      // Convert tripDate string to Date or null
      const tripDate =
        parsed.tripDate && parsed.tripDate.trim()
          ? new Date(parsed.tripDate)
          : null;

      // Create the loadout with all form data
      const loadoutId = await createLoadout(
        parsed.name.trim(),
        tripDate,
        {
          description: parsed.description?.trim() || '',
          seasons: parsed.seasons || [],
          activityTypes: parsed.activityTypes || [],
        }
      );

      // Navigate to the loadout editor (Step 2)
      router.push(`/loadouts/${loadoutId}`);
    } catch (error) {
      console.error('[useLoadoutCreationForm] Submit error:', error);
      // Error toast is handled by createLoadout
    }
  };

  const onCancel = () => {
    router.push('/loadouts');
  };

  return {
    form,
    onSubmit,
    onCancel,
    isSubmitting: form.formState.isSubmitting,
    toggleSeason,
    toggleActivity,
    selectedSeasons,
    selectedActivities,
  };
}
