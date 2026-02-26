/**
 * ProfileEditForm Component
 *
 * Feature: 008-auth-and-profile, 041-loadout-ux-profile
 * T033: Profile edit form with react-hook-form and Zod validation
 * T035: Field validation (displayName 2-50, trailName 2-30, bio max 500, URL validation)
 * T036: Save action preserving isVIP and first_launch
 * T037: Cancel action discarding unsaved changes
 * T038: Toast notifications for save success/error
 * Feature 041: Avatar upload component added at top of form
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { profileSchema, type ProfileFormData } from '@/lib/validations/profile-schema';
import { AvatarUploadInput } from '@/components/profile/AvatarUploadInput';
import { LocationAutocomplete } from '@/components/profile/LocationAutocomplete';
import type { MergedUser } from '@/types/auth';
import type { LocationSelection } from '@/types/profile';

// =============================================================================
// Component
// =============================================================================

interface ProfileEditFormProps {
  /** Current merged user data */
  user: MergedUser;
  /** Callback to save profile */
  onSave: (data: ProfileFormData) => Promise<void>;
  /** Callback to cancel editing */
  onCancel: () => void;
}

export function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const t = useTranslations('Profile.edit');
  const [isLoading, setIsLoading] = useState(false);
  // Feature 041: Track avatar changes separately (outside form state)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  // Feature 041: Track location with coordinates
  const [locationName, setLocationName] = useState<string>(user.locationName || '');

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user.displayName || '',
      trailName: user.trailName || '',
      bio: user.bio || '',
      location: user.location || '',
      avatarUrl: user.avatarUrl || '',
      // Feature 041: Location fields
      locationName: user.locationName || '',
      latitude: user.latitude ?? undefined,
      longitude: user.longitude ?? undefined,
      instagram: user.instagram || '',
      facebook: user.facebook || '',
      youtube: user.youtube || '',
      website: user.website || '',
    },
  });

  // Feature 041: Handle avatar changes
  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
    form.setValue('avatarUrl', url ?? '');
  };

  // Feature 041: Handle location selection
  const handleLocationSelect = (location: LocationSelection | null) => {
    if (location) {
      setLocationName(location.formattedAddress);
      form.setValue('locationName', location.formattedAddress);
      form.setValue('latitude', location.latitude);
      form.setValue('longitude', location.longitude);
    } else {
      setLocationName('');
      form.setValue('locationName', '');
      form.setValue('latitude', undefined);
      form.setValue('longitude', undefined);
    }
  };

  async function onSubmit(data: ProfileFormData) {
    setIsLoading(true);

    try {
      await onSave(data);
      // T038: Success toast
      toast.success(t('profileUpdated'), {
        description: t('profileUpdatedDescription'),
      });
    } catch (error) {
      // T038: Error toast
      const message = error instanceof Error ? error.message : t('saveFailedDefault');
      toast.error(t('saveFailed'), {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // T037: Cancel discards changes
  function handleCancel() {
    form.reset();
    onCancel();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Feature 041: Avatar Upload Section */}
        <div className="py-2">
          <AvatarUploadInput
            value={avatarUrl}
            providerAvatarUrl={user.providerAvatarUrl}
            displayName={user.displayName}
            userId={user.uid}
            onChange={handleAvatarChange}
            disabled={isLoading}
          />
        </div>

        <Separator />

        {/* Display Name */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('displayNameLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('displayNamePlaceholder')}
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('displayNameDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trail Name */}
        <FormField
          control={form.control}
          name="trailName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('trailNameLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('trailNamePlaceholder')}
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('trailNameDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('bioLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('bioPlaceholder')}
                  className="min-h-[100px] resize-none"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('bioCharCount', { count: field.value?.length || 0 })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Feature 041: Location with autocomplete */}
        <FormItem>
          <FormLabel>{t('locationLabel')}</FormLabel>
          <FormControl>
            <LocationAutocomplete
              value={locationName}
              onSelect={handleLocationSelect}
              placeholder={t('locationPlaceholder')}
              disabled={isLoading}
            />
          </FormControl>
          <FormDescription>
            {t('locationDescription')}
          </FormDescription>
        </FormItem>

        {/* Social Links Section */}
        <div className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-medium">{t('socialLinksTitle')}</h4>

          {/* Instagram */}
          <FormField
            control={form.control}
            name="instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('instagramLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('usernameOrUrlPlaceholder')}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Facebook */}
          <FormField
            control={form.control}
            name="facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('facebookLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('usernameOrUrlPlaceholder')}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* YouTube */}
          <FormField
            control={form.control}
            name="youtube"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('youtubeLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('channelUrlPlaceholder')}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Website */}
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('websiteLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('websiteUrlPlaceholder')}
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('saveChanges')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
