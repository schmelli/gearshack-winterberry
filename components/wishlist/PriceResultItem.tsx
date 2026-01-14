/**
 * Price Result Item Component (Stateless UI)
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { PriceResult } from '@/types/price-tracking';

interface PriceResultItemProps {
  result: PriceResult;
  isLowest?: boolean;
}

export function PriceResultItem({ result, isLowest }: PriceResultItemProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <Card className={isLowest ? 'border-green-500 border-2' : ''}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Product Image */}
          {result.product_image_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={result.product_image_url}
              alt={result.product_name}
              className="w-16 h-16 object-cover rounded"
            />
          )}

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">
                {result.product_name}
              </h4>
              {isLowest && (
                <Badge variant="default" className="bg-green-500">
                  Lowest
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {result.source_name}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              {result.is_local && (
                <Badge variant="secondary" className="text-xs">
                  🌱 Local
                  {result.distance_km && ` • ${result.distance_km.toFixed(1)}km`}
                </Badge>
              )}
              {result.product_condition && (
                <Badge variant="outline" className="text-xs">
                  {result.product_condition}
                </Badge>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">
                {formatPrice(result.price_amount, result.price_currency)}
              </span>
              {result.shipping_cost && result.shipping_cost > 0 && (
                <span className="text-xs text-muted-foreground">
                  + {formatPrice(result.shipping_cost, result.shipping_currency)} shipping
                </span>
              )}
            </div>

            {result.shipping_cost && result.shipping_cost > 0 && (
              <p className="text-sm font-medium mt-1">
                Total: {formatPrice(result.total_price, result.price_currency)}
              </p>
            )}
          </div>

          {/* Action Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(result.source_url, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
