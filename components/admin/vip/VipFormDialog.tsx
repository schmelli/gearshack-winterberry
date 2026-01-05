'use client';

/**
 * VIP Form Dialog Component
 *
 * Feature: 052-vip-loadouts
 * Task: T036
 *
 * Dialog for creating and editing VIP accounts.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { createVip, updateVip } from '@/lib/vip/vip-admin-service';
import { createVipRequestSchema, type VipWithStats } from '@/types/vip';
import { toast } from 'sonner';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

interface VipFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vip?: VipWithStats | null;
  onSuccess: () => void;
}

// Extended schema for form (includes slug for creation)
const formSchema = createVipRequestSchema.extend({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only').min(2).max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

// =============================================================================
// Component
// =============================================================================

export function VipFormDialog({
  open,
  onOpenChange,
  vip,
  onSuccess,
}: VipFormDialogProps) {
  const t = useTranslations('vip.admin.form');
  const isEditing = !!vip;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bio: '',
      avatarUrl: '',
      isFeatured: false as boolean,
      socialLinks: {
        youtube: '',
        instagram: '',
        website: '',
        twitter: '',
      },
    },
  });

  // Reset form when vip changes
  useEffect(() => {
    if (vip) {
      form.reset({
        name: vip.name,
        bio: vip.bio,
        avatarUrl: vip.avatarUrl,
        isFeatured: vip.isFeatured,
        socialLinks: vip.socialLinks as FormData['socialLinks'],
      });
    } else {
      form.reset({
        name: '',
        bio: '',
        avatarUrl: '',
        isFeatured: false,
        socialLinks: {
          youtube: '',
          instagram: '',
          website: '',
          twitter: '',
        },
      });
    }
  }, [vip, form]);

  // Auto-generate slug from name
  const watchedName = form.watch('name');
  useEffect(() => {
    if (!isEditing && watchedName) {
      const slug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      form.setValue('slug', slug);
    }
  }, [watchedName, isEditing, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && vip) {
        await updateVip(vip.id, data);
        toast.success(t('vipUpdated'));
      } else {
        await createVip({ ...data, slug: data.slug! });
        toast.success(t('vipCreated'));
      }
      onSuccess();
    } catch (err) {
      toast.error(isEditing ? t('updateFailed') : t('createFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTitle') : t('addTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug (only for creation) */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('slug')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('slugPlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>{t('slugHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('bioPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avatar URL */}
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('avatarUrl')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('avatarUrlPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Social Links */}
            <div className="space-y-3">
              <FormLabel>{t('socialLinksHint')}</FormLabel>

              <FormField
                control={form.control}
                name="socialLinks.youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder={t('youtube')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialLinks.instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder={t('instagram')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialLinks.website"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder={t('website')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialLinks.twitter"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder={t('twitter')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Featured Toggle */}
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('isFeatured')}</FormLabel>
                    <FormDescription>
                      {t('isFeaturedHint')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default VipFormDialog;
