/**
 * OfferCreationForm Component
 *
 * Feature: 053-merchant-integration
 * Task: T050
 *
 * Form for creating personalized offers with pricing, message,
 * expiration, and batch send capabilities.
 */

'use client';

import { memo, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  Package,
  Users,
  Tag,
  MessageSquare,
  Calendar,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { createOffersSchema, type CreateOffersInput } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface OfferCreationFormProps {
  /** Catalog item being offered */
  catalogItem: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    imageUrl: string | null;
  };
  /** User IDs to send offers to */
  userIds: string[];
  /** Submitting state */
  isSubmitting: boolean;
  /** Calculate fee function */
  calculateFee: (offerPrice: number, userCount: number) => number;
  /** Submit callback */
  onSubmit: (input: CreateOffersInput) => Promise<void>;
  /** Cancel callback */
  onCancel: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function calculateDiscount(regular: number, offer: number): number {
  if (regular <= 0) return 0;
  return Math.round(((regular - offer) / regular) * 100);
}

// =============================================================================
// Component
// =============================================================================

export const OfferCreationForm = memo(function OfferCreationForm({
  catalogItem,
  userIds,
  isSubmitting,
  calculateFee,
  onSubmit,
  onCancel,
  className,
}: OfferCreationFormProps) {
  const t = useTranslations('MerchantOffers');

  const form = useForm<CreateOffersInput>({
    resolver: zodResolver(createOffersSchema),
    defaultValues: {
      catalogItemId: catalogItem.id,
      regularPrice: catalogItem.price,
      offerPrice: Math.round(catalogItem.price * 0.9 * 100) / 100, // 10% off default
      message: '',
      expiresInDays: 14,
      userIds,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() returns reactive values that work correctly despite compiler warning
  const watchOfferPrice = form.watch('offerPrice');
  const watchExpiresInDays = form.watch('expiresInDays');

  // Calculate derived values
  const discount = useMemo(
    () => calculateDiscount(catalogItem.price, watchOfferPrice),
    [catalogItem.price, watchOfferPrice]
  );

  const fee = useMemo(
    () => calculateFee(watchOfferPrice, userIds.length),
    [calculateFee, watchOfferPrice, userIds.length]
  );

  const expirationDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + (watchExpiresInDays || 14));
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [watchExpiresInDays]);

  const handleSubmit = useCallback(
    async (data: CreateOffersInput) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn('space-y-6', className)}>
        {/* Product Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('productInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                {catalogItem.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={catalogItem.imageUrl}
                    alt={catalogItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{catalogItem.name}</h3>
                {catalogItem.brand && (
                  <p className="text-sm text-muted-foreground">{catalogItem.brand}</p>
                )}
                <p className="text-lg font-semibold mt-1">{formatPrice(catalogItem.price)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('recipients')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-lg py-2 px-4">
                {userIds.length} {t('users')}
              </Badge>
              <p className="text-sm text-muted-foreground">{t('recipientsDescription')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t('pricing')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="offerPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('offerPrice')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={catalogItem.price - 0.01}
                        className="pl-8"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('discountDisplay', { percent: discount })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount Preview */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('regularPrice')}</span>
                <span>{formatPrice(catalogItem.price)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('discount')}</span>
                <span className="text-green-600">-{formatPrice(catalogItem.price - watchOfferPrice)}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between font-medium">
                <span>{t('offerPrice')}</span>
                <span className="text-lg">{formatPrice(watchOfferPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('personalMessage')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={t('messagePlaceholder')}
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('messageCharCount', { count: field.value?.length || 0, max: 500 })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Expiration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('expiration')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('expiresInDays')}</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Slider
                        value={[field.value || 14]}
                        onValueChange={(value) => field.onChange(value[0])}
                        min={1}
                        max={30}
                        step={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>1 {t('day')}</span>
                        <span className="font-medium text-foreground">
                          {field.value} {t('days')}
                        </span>
                        <span>30 {t('days')}</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>{t('expiresOn', { date: expirationDate })}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Fee Summary */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('feeTitle')}</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span>
                  {t('feePerOffer')} × {userIds.length} {t('offers')}
                </span>
                <span className="font-medium">{formatPrice(fee)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t('feeDescription')}</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Form Errors */}
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('sending')}
              </>
            ) : (
              t('sendOffers', { count: userIds.length })
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
});
