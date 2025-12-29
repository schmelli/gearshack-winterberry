/**
 * MerchantApplicationForm Component
 *
 * Feature: 053-merchant-integration
 * Task: T085
 *
 * Form for users to apply to become merchants.
 * Validates input and submits application for admin review.
 */

'use client';

import { memo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Globe, Store, Loader2, CheckCircle } from 'lucide-react';
import {
  merchantApplicationSchema,
  type MerchantApplicationInput,
} from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface MerchantApplicationFormProps {
  onSuccess?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const MerchantApplicationForm = memo(function MerchantApplicationForm({
  onSuccess,
  className,
}: MerchantApplicationFormProps) {
  const t = useTranslations('MerchantApplication');
  const { user } = useAuth();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<MerchantApplicationInput>({
    resolver: zodResolver(merchantApplicationSchema),
    defaultValues: {
      businessName: '',
      businessType: 'local',
      contactEmail: user?.email || '',
      contactPhone: '',
      website: '',
      description: '',
      taxId: '',
    },
  });

  const handleSubmit = async (data: MerchantApplicationInput) => {
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user already has an application
      const { data: existing } = await supabase
        .from('merchants')
        .select('id, status')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        if (existing.status === 'pending') {
          toast.error(t('alreadyPending'));
        } else if (existing.status === 'approved') {
          toast.error(t('alreadyApproved'));
        } else {
          // Update existing rejected/suspended application
          const { error: updateError } = await supabase
            .from('merchants')
            .update({
              business_name: data.businessName,
              business_type: data.businessType,
              contact_email: data.contactEmail,
              contact_phone: data.contactPhone || null,
              website: data.website || null,
              description: data.description || null,
              tax_id: data.taxId || null,
              status: 'pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;

          setSubmitted(true);
          toast.success(t('resubmitSuccess'));
          onSuccess?.();
        }
        return;
      }

      // Create new application
      const { error: insertError } = await supabase.from('merchants').insert({
        user_id: user.id,
        business_name: data.businessName,
        business_type: data.businessType,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone || null,
        website: data.website || null,
        description: data.description || null,
        tax_id: data.taxId || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      toast.success(t('submitSuccess'));
      onSuccess?.();
    } catch (err) {
      console.error('Failed to submit application:', err);
      toast.error(t('submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('successTitle')}</h3>
            <p className="text-muted-foreground">{t('successMessage')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Business Name */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('businessName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('businessNamePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('businessNameHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Business Type */}
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('businessType')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('businessTypePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          <span>{t('typeLocal')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="chain">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{t('typeChain')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>{t('typeOnline')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('businessTypeHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Email */}
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contactEmail')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('contactEmailPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('contactEmailHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Phone */}
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contactPhone')}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t('contactPhonePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('contactPhoneHelp')}</FormDescription>
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
                  <FormLabel>{t('website')}</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t('websitePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('websiteHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax ID */}
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('taxId')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('taxIdPlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>{t('taxIdHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('businessDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('businessDescriptionPlaceholder')}
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('businessDescriptionHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms Notice */}
            <Alert>
              <AlertDescription>{t('termsNotice')}</AlertDescription>
            </Alert>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});

export default MerchantApplicationForm;
