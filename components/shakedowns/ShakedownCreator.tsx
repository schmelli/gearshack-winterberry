'use client';

/**
 * ShakedownCreator Component
 *
 * Feature: 001-community-shakedowns
 * Task: T019
 *
 * Form for creating a new shakedown request.
 * Users can request community feedback on their loadout by providing:
 * - Trip details (name, dates)
 * - Experience level
 * - Specific concerns (optional)
 * - Privacy setting
 *
 * Architecture: Feature-Sliced Light
 * - Stateless UI component
 * - Business logic in useShakedownMutations hook
 * - Validation via Zod schema
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useShakedownMutations } from '@/hooks/shakedowns';
import type { Shakedown } from '@/types/shakedown';
import { EXPERIENCE_LEVELS, PRIVACY_OPTIONS } from '@/types/shakedown';

// =============================================================================
// Form Schema
// =============================================================================

/**
 * Form-specific validation schema
 * Similar to createShakedownSchema but without .default() transformations
 * to ensure proper type compatibility with react-hook-form
 */
const shakedownFormSchema = z.object({
  loadoutId: z.string().uuid('Invalid loadout ID'),
  tripName: z
    .string()
    .min(1, 'Trip name is required')
    .max(100, 'Trip name must be 100 characters or less'),
  tripStartDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date',
  }),
  tripEndDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date',
  }),
  experienceLevel: z.enum(['beginner', 'intermediate', 'experienced', 'expert']),
  concerns: z
    .string()
    .max(1000, 'Concerns must be 1000 characters or less')
    .optional()
    .or(z.literal('')),
  privacy: z.enum(['public', 'friends_only', 'private']),
}).refine(
  (data) => {
    const start = new Date(data.tripStartDate);
    const end = new Date(data.tripEndDate);
    return end >= start;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['tripEndDate'],
  }
);

type FormValues = z.infer<typeof shakedownFormSchema>;

// =============================================================================
// Types
// =============================================================================

interface ShakedownCreatorProps {
  loadoutId: string;
  loadoutName: string;
  onSuccess?: (shakedown: Shakedown) => void;
  onCancel?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ShakedownCreator({
  loadoutId,
  loadoutName,
  onSuccess,
  onCancel,
}: ShakedownCreatorProps) {
  const t = useTranslations('Shakedowns');
  const tCommon = useTranslations('Common');
  const { createShakedown, isCreating } = useShakedownMutations();

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(shakedownFormSchema),
    defaultValues: {
      loadoutId,
      tripName: '',
      tripStartDate: '',
      tripEndDate: '',
      experienceLevel: 'intermediate',
      concerns: '',
      privacy: 'friends_only',
    },
  });

  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    const { data: shakedown, error } = await createShakedown({
      loadoutId: values.loadoutId,
      tripName: values.tripName,
      tripStartDate: values.tripStartDate,
      tripEndDate: values.tripEndDate,
      experienceLevel: values.experienceLevel,
      concerns: values.concerns || undefined,
      privacy: values.privacy,
    });

    if (error) {
      toast.error(t('errors.createFailed'));
      return;
    }

    if (shakedown) {
      toast.success(t('success.created'));
      onSuccess?.(shakedown);
    }
  };

  // Get today's date in YYYY-MM-DD format for date input min attribute
  const today = format(new Date(), 'yyyy-MM-dd');

  // Watch start date to set min for end date
  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() returns reactive values that work correctly despite compiler warning
  const startDate = form.watch('tripStartDate');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('requestShakedown')}</CardTitle>
        <CardDescription>
          {t('subtitle')} - {loadoutName}
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            {/* Trip Name */}
            <FormField
              control={form.control}
              name="tripName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tripName')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('tripNamePlaceholder')}
                      maxLength={100}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trip Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="tripStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('startDate')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="date"
                          min={today}
                          disabled={isCreating}
                          className="pr-10"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="tripEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('endDate')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="date"
                          min={startDate || today}
                          disabled={isCreating}
                          className="pr-10"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Experience Level */}
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('experienceLevel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex flex-col">
                            <span>{t(`experience.${level.value}`)}</span>
                            <span className="text-xs text-muted-foreground">
                              {t(`experience.${level.value}Desc`)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Specific Concerns (Optional) */}
            <FormField
              control={form.control}
              name="concerns"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('concerns')}{' '}
                    <span className="text-muted-foreground font-normal">
                      ({tCommon('optional')})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('concernsPlaceholder')}
                      maxLength={1000}
                      rows={3}
                      disabled={isCreating}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground text-right">
                    {field.value?.length || 0}/1000
                  </div>
                </FormItem>
              )}
            />

            {/* Privacy Setting */}
            <FormField
              control={form.control}
              name="privacy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('privacy')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIVACY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>
                              {t(
                                `privacyOptions.${option.value === 'friends_only' ? 'friendsOnly' : option.value}`
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t(
                                `privacyOptions.${option.value === 'friends_only' ? 'friendsOnly' : option.value}Desc`
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
            >
              {tCommon('cancel')}
            </Button>

            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? tCommon('submitting') : t('create')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default ShakedownCreator;
