/**
 * ProfileEditForm Component
 *
 * Feature: 008-auth-and-profile
 * T033: Profile edit form with react-hook-form and Zod validation
 * T035: Field validation (displayName 2-50, trailName 2-30, bio max 500, URL validation)
 * T036: Save action preserving isVIP and first_launch
 * T037: Cancel action discarding unsaved changes
 * T038: Toast notifications for save success/error
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { MergedUser } from '@/types/auth';

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
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user.displayName || '',
      trailName: user.trailName || '',
      bio: user.bio || '',
      location: user.location || '',
      instagram: user.instagram || '',
      facebook: user.facebook || '',
      youtube: user.youtube || '',
      website: user.website || '',
    },
  });

  async function onSubmit(data: ProfileFormData) {
    setIsLoading(true);

    try {
      await onSave(data);
      // T038: Success toast
      toast.success('Profile updated', {
        description: 'Your profile has been saved successfully.',
      });
    } catch (error) {
      // T038: Error toast
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error('Save failed', {
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
        {/* Display Name */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your name"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormDescription>2-50 characters</FormDescription>
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
              <FormLabel>Trail Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your trail name (optional)"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormDescription>2-30 characters (optional)</FormDescription>
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
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px] resize-none"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/500 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="City, Country"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Social Links Section */}
        <div className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Social Links</h4>

          {/* Instagram */}
          <FormField
            control={form.control}
            name="instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Instagram</FormLabel>
                <FormControl>
                  <Input
                    placeholder="username or URL"
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
                <FormLabel className="text-xs">Facebook</FormLabel>
                <FormControl>
                  <Input
                    placeholder="username or URL"
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
                <FormLabel className="text-xs">YouTube</FormLabel>
                <FormControl>
                  <Input
                    placeholder="channel URL"
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
                <FormLabel className="text-xs">Website</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com"
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
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
