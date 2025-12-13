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
  type LoadoutCreationFormOutput,
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

  const selectedSeasons = form.watch('seasons') ?? [];
  const selectedActivities = form.watch('activityTypes') ?? [];

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
      // Parse and transform the validated data
      const parsed: LoadoutCreationFormOutput = loadoutCreationFormSchema.parse(data);

      // Create the loadout with all form data
      // All transformations are handled by the schema
      const loadoutId = await createLoadout(
        parsed.name,
        parsed.tripDate,
        {
          description: parsed.description || '',
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
