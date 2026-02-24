/**
 * Announcement Form Component
 *
 * Feature: Community Hub Enhancement
 *
 * Form for creating/editing community announcements.
 * Simpler than BannerForm - no image upload, has type selection.
 */

'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Loader2, Info, AlertTriangle, CheckCircle, Tag } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CommunityAnnouncement,
  CreateAnnouncementInput,
  AnnouncementType,
} from '@/types/community';

// ============================================================================
// Types
// ============================================================================

interface AnnouncementFormProps {
  announcement?: CommunityAnnouncement;
  onSubmit: (data: CreateAnnouncementInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ANNOUNCEMENT_TYPES: {
  value: AnnouncementType;
  icon: React.ReactNode;
  colorClass: string;
}[] = [
  { value: 'info', icon: <Info className="h-4 w-4" />, colorClass: 'text-blue-600' },
  { value: 'warning', icon: <AlertTriangle className="h-4 w-4" />, colorClass: 'text-amber-600' },
  { value: 'success', icon: <CheckCircle className="h-4 w-4" />, colorClass: 'text-green-600' },
  { value: 'promo', icon: <Tag className="h-4 w-4" />, colorClass: 'text-purple-600' },
];

// ============================================================================
// Component
// ============================================================================

export function AnnouncementForm({
  announcement,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AnnouncementFormProps) {
  const t = useTranslations('Announcement.admin');

  const form = useForm<CreateAnnouncementInput>({
    defaultValues: {
      title: announcement?.title ?? '',
      message: announcement?.message ?? '',
      type: announcement?.type ?? 'info',
      priority: announcement?.priority ?? 0,
      link_url: announcement?.link_url ?? null,
      link_text: announcement?.link_text ?? null,
      starts_at: announcement?.starts_at ?? new Date().toISOString(),
      ends_at: announcement?.ends_at ?? null,
      is_active: announcement?.is_active ?? true,
    },
  });

  const handleSubmit = async (data: CreateAnnouncementInput) => {
    // Clean up null values for optional fields
    const cleanedData = {
      ...data,
      link_url: data.link_url || null,
      link_text: data.link_text || null,
      ends_at: data.ends_at || null,
    };
    await onSubmit(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          rules={{ required: 'Title is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.title')}</FormLabel>
              <FormControl>
                <Input placeholder={t('placeholderTitle')} {...field} />
              </FormControl>
              <FormDescription>{t('fields.titleHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Message */}
        <FormField
          control={form.control}
          name="message"
          rules={{ required: 'Message is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.message')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('placeholderMessage')}
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('fields.messageHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.type')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholderType')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className={`flex items-center gap-2 ${type.colorClass}`}>
                        {type.icon}
                        <span className="capitalize">{type.value}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t('fields.typeHelp')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Link URL and Text */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="link_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.linkUrl')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('placeholderLinkUrl')}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>{t('fields.linkUrlHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="link_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.linkText')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('placeholderLinkText')}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>{t('fields.linkTextHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Visibility dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="starts_at"
            rules={{ required: 'Start date is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.startsAt')}</FormLabel>
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
            name="ends_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.endsAt')}</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value?.slice(0, 16) ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value).toISOString() : null
                      )
                    }
                  />
                </FormControl>
                <FormDescription>{t('fields.endsAtHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Priority and active toggle */}
        <div className="flex items-center gap-6">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{t('fields.priority')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormDescription>{t('fields.priorityHelp')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
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
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {announcement ? t('edit') : t('create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
