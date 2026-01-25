/**
 * Price Result Card Component
 * Feature: 050-price-tracking
 *
 * Displays a single price result from a retailer/source.
 * Shows price, source, shipping, and condition.
 */

'use client';

import { ExternalLink, MapPin, Truck } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, sanitizeExternalUrl } from '@/lib/utils';
import type { PriceResult } from '@/types/price-tracking';

interface PriceResultCardProps {
  result: PriceResult;
  isLowestPrice?: boolean;
  className?: string;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
  open_box: 'Open Box',
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  google_shopping: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ebay: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  retailer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  local_shop: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export function PriceResultCard({
  result,
  isLowestPrice = false,
  className,
}: PriceResultCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: result.price_currency,
  }).format(result.price_amount);

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: result.price_currency,
  }).format(result.total_price);

  const hasShipping = result.shipping_cost !== null && result.shipping_cost > 0;

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md',
      isLowestPrice && 'ring-2 ring-green-500',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Product Image */}
          {result.product_image_url && (
            <div className="relative shrink-0 h-16 w-16">
              <Image
                src={result.product_image_url}
                alt={result.product_name}
                fill
                className="rounded-md object-cover"
                sizes="64px"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Source and badges */}
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className={cn('text-xs', SOURCE_TYPE_COLORS[result.source_type])}
              >
                {result.source_name}
              </Badge>
              {result.product_condition && (
                <Badge variant="outline" className="text-xs">
                  {CONDITION_LABELS[result.product_condition] || result.product_condition}
                </Badge>
              )}
              {isLowestPrice && (
                <Badge className="bg-green-500 text-white text-xs">
                  Lowest Price
                </Badge>
              )}
            </div>

            {/* Product name */}
            <p className="text-sm font-medium truncate" title={result.product_name}>
              {result.product_name}
            </p>

            {/* Price info */}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg font-bold text-primary">
                {formattedPrice}
              </span>
              {hasShipping && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" />+{result.shipping_currency}{result.shipping_cost?.toFixed(2)} shipping
                </span>
              )}
            </div>

            {/* Total if different from price */}
            {hasShipping && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Total: {formattedTotal}
              </p>
            )}

            {/* Local shop distance */}
            {result.is_local && result.distance_km !== null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {result.distance_km.toFixed(1)} km away
              </p>
            )}
          </div>

          {/* View button - SECURITY: Validate URL before rendering */}
          {sanitizeExternalUrl(result.source_url) && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="shrink-0"
            >
              <a
                href={sanitizeExternalUrl(result.source_url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
