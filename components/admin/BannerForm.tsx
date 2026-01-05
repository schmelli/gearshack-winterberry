/**
 * Banner Form Component
 *
 * Feature: 056-community-hub-enhancements
 * Task: T030
 *
 * Form for creating/editing community banners with Cloudinary image upload.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { createBannerSchema, type CreateBannerInput, type CommunityBanner } from '@/types/banner';

// ============================================================================
// Types
// ============================================================================

interface BannerFormProps {
  banner?: CommunityBanner;
  onSubmit: (data: CreateBannerInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface CloudinaryResult {
  info: {
    secure_url: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function BannerForm({
  banner,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BannerFormProps) {
  const t = useTranslations('Banner.admin');

  const form = useForm<CreateBannerInput>({
    resolver: zodResolver(createBannerSchema),
    defaultValues: {
      heroImageUrl: banner?.heroImageUrl ?? '',
      ctaText: banner?.ctaText ?? '',
      buttonText: banner?.buttonText ?? '',
      targetUrl: banner?.targetUrl ?? '',
      visibilityStart: banner?.visibilityStart ?? new Date().toISOString(),
      visibilityEnd:
        banner?.visibilityEnd ??
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      displayOrder: banner?.displayOrder ?? 0,
      isActive: banner?.isActive ?? true,
    },
  });

  const handleSubmit = async (data: CreateBannerInput) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Hero Image */}
        <FormField
          control={form.control}
          name="heroImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.heroImage')}</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {field.value && (
                    <div className="relative aspect-[21/9] overflow-hidden rounded-lg bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={field.value}
                        alt="Banner preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={field.value}
                      onChange={field.onChange}
                      className="flex-1"
                    />
                    <CldUploadWidget
                      uploadPreset={
                        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
                      }
                      options={{
                        folder: 'banners',
                        maxFiles: 1,
                        resourceType: 'image',
                        cropping: true,
                        croppingAspectRatio: 21 / 9,
                      }}
                      onSuccess={(result) => {
                        const cloudinaryResult = result as CloudinaryResult;
                        field.onChange(cloudinaryResult.info.secure_url);
                      }}
                    >
                      {({ open }) => (
                        <Button type="button" variant="outline" onClick={() => open()}>
                          Upload
                        </Button>
                      )}
                    </CldUploadWidget>
                  </div>
                </div>
              </FormControl>
              <FormDescription>{t('fields.heroImageHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CTA Text */}
        <FormField
          control={form.control}
          name="ctaText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.ctaText')}</FormLabel>
              <FormControl>
                <Input placeholder="Check out our latest gear!" {...field} />
              </FormControl>
              <FormDescription>{t('fields.ctaTextHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Button Text */}
        <FormField
          control={form.control}
          name="buttonText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.buttonText')}</FormLabel>
              <FormControl>
                <Input placeholder="Shop Now" {...field} />
              </FormControl>
              <FormDescription>{t('fields.buttonTextHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Target URL */}
        <FormField
          control={form.control}
          name="targetUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.targetUrl')}</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>{t('fields.targetUrlHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Visibility dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="visibilityStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.visibilityStart')}</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value?.slice(0, 16) ?? ''}
                    onChange={(e) =>
                      field.onChange(new Date(e.target.value).toISOString())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibilityEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.visibilityEnd')}</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value?.slice(0, 16) ?? ''}
                    onChange={(e) =>
                      field.onChange(new Date(e.target.value).toISOString())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Display order and active toggle */}
        <div className="flex items-center gap-6">
          <FormField
            control={form.control}
            name="displayOrder"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{t('fields.displayOrder')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormDescription>{t('fields.displayOrderHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 pt-4">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0 cursor-pointer">
                  {t('fields.isActive')}
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {banner ? t('edit') : t('create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
