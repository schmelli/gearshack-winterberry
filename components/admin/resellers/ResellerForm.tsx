/**
 * ResellerForm Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Form for creating and editing resellers
 *
 * Constitution: UI components must be stateless - all logic in hooks
 */

'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { Reseller, CreateResellerInput, ResellerType, ResellerStatus } from '@/types/reseller';

// =============================================================================
// Schema
// =============================================================================

const resellerFormSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  websiteUrl: z.string().url('Ungültige URL'),
  logoUrl: z.string().url('Ungültige URL').optional().or(z.literal('')),
  resellerType: z.enum(['local', 'online', 'chain']),
  status: z.enum(['standard', 'vip', 'partner', 'suspended']),
  countriesServed: z.array(z.string()).min(1, 'Mindestens ein Land erforderlich'),
  searchUrlTemplate: z.string().optional().or(z.literal('')),
  affiliateTag: z.string().optional().or(z.literal('')),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  addressLine1: z.string().optional().or(z.literal('')),
  addressLine2: z.string().optional().or(z.literal('')),
  addressCity: z.string().optional().or(z.literal('')),
  addressPostalCode: z.string().optional().or(z.literal('')),
  addressCountry: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
  priority: z.number().min(0).max(100),
});

type ResellerFormValues = z.infer<typeof resellerFormSchema>;

// =============================================================================
// Types
// =============================================================================

interface ResellerFormProps {
  /** Existing reseller for editing (null for create) */
  reseller?: Reseller | null;
  /** Callback when form is submitted */
  onSubmit: (data: CreateResellerInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const COMMON_COUNTRIES = [
  'DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'CZ',
];

const RESELLER_TYPES: { value: ResellerType; label: string }[] = [
  { value: 'local', label: 'Lokaler Shop' },
  { value: 'online', label: 'Online-Shop' },
  { value: 'chain', label: 'Handelskette' },
];

const RESELLER_STATUSES: { value: ResellerStatus; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'vip', label: 'VIP' },
  { value: 'partner', label: 'Partner' },
  { value: 'suspended', label: 'Gesperrt' },
];

// =============================================================================
// Component
// =============================================================================

export function ResellerForm({
  reseller,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ResellerFormProps) {
  const t = useTranslations('AdminResellers.form');

  const form = useForm<ResellerFormValues>({
    resolver: zodResolver(resellerFormSchema),
    defaultValues: {
      name: reseller?.name ?? '',
      websiteUrl: reseller?.websiteUrl ?? '',
      logoUrl: reseller?.logoUrl ?? '',
      resellerType: reseller?.resellerType ?? 'online',
      status: reseller?.status ?? 'standard',
      countriesServed: reseller?.countriesServed ?? ['DE'],
      searchUrlTemplate: reseller?.searchUrlTemplate ?? '',
      affiliateTag: reseller?.affiliateTag ?? '',
      latitude: reseller?.location?.latitude ?? null,
      longitude: reseller?.location?.longitude ?? null,
      addressLine1: reseller?.addressLine1 ?? '',
      addressLine2: reseller?.addressLine2 ?? '',
      addressCity: reseller?.addressCity ?? '',
      addressPostalCode: reseller?.addressPostalCode ?? '',
      addressCountry: reseller?.addressCountry ?? '',
      isActive: reseller?.isActive ?? true,
      priority: reseller?.priority ?? 50,
    },
  });

  const handleSubmit = async (values: ResellerFormValues) => {
    await onSubmit({
      name: values.name,
      websiteUrl: values.websiteUrl,
      logoUrl: values.logoUrl || null,
      resellerType: values.resellerType,
      status: values.status,
      countriesServed: values.countriesServed,
      searchUrlTemplate: values.searchUrlTemplate || null,
      affiliateTag: values.affiliateTag || null,
      latitude: values.latitude,
      longitude: values.longitude,
      addressLine1: values.addressLine1 || null,
      addressLine2: values.addressLine2 || null,
      addressCity: values.addressCity || null,
      addressPostalCode: values.addressPostalCode || null,
      addressCountry: values.addressCountry || null,
      isActive: values.isActive,
      priority: values.priority,
    });
  };

  const toggleCountry = (country: string) => {
    const current = form.getValues('countriesServed');
    if (current.includes(country)) {
      form.setValue('countriesServed', current.filter((c) => c !== country));
    } else {
      form.setValue('countriesServed', [...current, country]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('name')}</FormLabel>
                <FormControl>
                  <Input placeholder="Globetrotter" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('websiteUrl')}</FormLabel>
                <FormControl>
                  <Input placeholder="https://www.globetrotter.de" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('logoUrl')}</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>{t('logoUrlHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="searchUrlTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('searchUrlTemplate')}</FormLabel>
                <FormControl>
                  <Input placeholder="https://shop.com/search?q={query}" {...field} />
                </FormControl>
                <FormDescription>{t('searchUrlTemplateHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Type and Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="resellerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('type')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESELLER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('status')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectStatus')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESELLER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('priority')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>{t('priorityHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Countries */}
        <FormField
          control={form.control}
          name="countriesServed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('countriesServed')}</FormLabel>
              <div className="flex flex-wrap gap-2">
                {COMMON_COUNTRIES.map((country) => (
                  <Badge
                    key={country}
                    variant={field.value.includes(country) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCountry(country)}
                  >
                    {country}
                    {field.value.includes(country) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address (for local shops) */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t('addressSection')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addressLine1')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Musterstraße 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('city')}</FormLabel>
                  <FormControl>
                    <Input placeholder="München" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressPostalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('postalCode')}</FormLabel>
                  <FormControl>
                    <Input placeholder="80331" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('country')}</FormLabel>
                  <FormControl>
                    <Input placeholder="DE" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('latitude')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="48.1351"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('longitude')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="11.5820"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Active toggle */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>{t('isActive')}</FormLabel>
                <FormDescription>{t('isActiveHint')}</FormDescription>
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
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : reseller ? t('update') : t('create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
