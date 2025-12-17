/**
 * Price Comparison View Component (Stateless UI)
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { PriceResultItem } from './PriceResultItem';
import { PersonalOfferBadge } from './PersonalOfferBadge';
import type { PriceSearchResults, PersonalOffer } from '@/types/price-tracking';

interface PriceComparisonViewProps {
  searchResults: PriceSearchResults | null;
  isLoading: boolean;
  personalOffers?: PersonalOffer[];
  onDismissOffer?: (offerId: string) => void;
}

export function PriceComparisonView({
  searchResults,
  isLoading,
  personalOffers = [],
  onDismissOffer,
}: PriceComparisonViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Finding prices...</p>
        </CardContent>
      </Card>
    );
  }

  if (!searchResults) {
    return null;
  }

  const { results, failed_sources, status } = searchResults;

  const formatPrice = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Personal Offers Section (US5) */}
      {personalOffers.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg">Exclusive Personal Offers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {personalOffers.map((offer) => {
              const partner = offer.partner_retailers as any;
              const partnerName = partner?.name || 'Partner';

              return (
                <div
                  key={offer.id}
                  className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-900"
                >
                  <div className="flex-1 space-y-2">
                    <PersonalOfferBadge validUntil={offer.valid_until} />

                    <div>
                      <p className="font-medium">{offer.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        from {partnerName}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatPrice(offer.offer_price, offer.currency)}
                      </span>
                      {offer.original_price && (
                        <>
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(offer.original_price, offer.currency)}
                          </span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            Save{' '}
                            {Math.round(
                              ((offer.original_price - offer.offer_price) /
                                offer.original_price) *
                                100
                            )}
                            %
                          </span>
                        </>
                      )}
                    </div>

                    {offer.description && (
                      <p className="text-sm text-muted-foreground">{offer.description}</p>
                    )}

                    {offer.terms && (
                      <p className="text-xs text-muted-foreground italic">{offer.terms}</p>
                    )}

                    <Button
                      asChild
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
                    >
                      <a
                        href={offer.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Offer
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  {onDismissOffer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismissOffer(offer.id)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {/* Warning for failed sources */}
      {failed_sources.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some sources unavailable: {failed_sources.map(s => s.source_name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* No results found */}
      {results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No prices found. Try adjusting the item name or check back later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Price results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Price Comparison ({results.length} results)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result, index) => (
              <PriceResultItem
                key={result.id}
                result={result}
                isLowest={index === 0}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
