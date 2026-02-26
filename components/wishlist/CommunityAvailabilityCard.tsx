/**
 * Community Availability Card Component (Stateless UI)
 * Feature: 050-price-tracking (US4)
 * Date: 2025-12-17
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, Eye, TrendingDown } from 'lucide-react';
import type { CommunityAvailability } from '@/types/price-tracking';

interface CommunityAvailabilityCardProps {
  availability: CommunityAvailability | null;
  isLoading: boolean;
  onMessageUser: () => void;
  onViewInventory: () => void;
  onSeePriceComparison: () => void;
}

export function CommunityAvailabilityCard({
  availability,
  isLoading,
  onMessageUser,
  onViewInventory,
  onSeePriceComparison,
}: CommunityAvailabilityCardProps) {
  const t = useTranslations('Wishlist.communityAvailability');
  const locale = useLocale();

  if (isLoading) {
    return null;
  }

  if (!availability || !availability.user_count || availability.user_count === 0) {
    return null;
  }

  // After the check above, user_count is guaranteed to be a positive number
  const userCount = availability.user_count;

  const formatPrice = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const priceRange =
    availability.min_price && availability.max_price
      ? `${formatPrice(availability.min_price)} - ${formatPrice(availability.max_price)}`
      : t('priceDataUnavailable');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {t('usersHaveItem', { count: userCount })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('peerPriceRange', { range: priceRange })}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {userCount}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMessageUser}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {t('messageUser')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewInventory}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('viewInventory')}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSeePriceComparison}
          className="w-full"
        >
          <TrendingDown className="h-4 w-4 mr-2" />
          {t('seePriceComparison')}
        </Button>
      </CardContent>
    </Card>
  );
}
