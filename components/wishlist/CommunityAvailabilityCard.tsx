/**
 * Community Availability Card Component (Stateless UI)
 * Feature: 050-price-tracking (US4)
 * Date: 2025-12-17
 */

'use client';

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
  if (isLoading) {
    return null;
  }

  if (!availability || availability.user_count === 0) {
    return null;
  }

  const formatPrice = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const priceRange =
    availability.min_price && availability.max_price
      ? `${formatPrice(availability.min_price)} - ${formatPrice(availability.max_price)}`
      : 'Price data unavailable';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Community Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {availability.user_count} {availability.user_count === 1 ? 'user has' : 'users have'} this item
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Peer price range: {priceRange}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {availability.user_count}
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
            Message user
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewInventory}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View inventory
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSeePriceComparison}
          className="w-full"
        >
          <TrendingDown className="h-4 w-4 mr-2" />
          See price comparison
        </Button>
      </CardContent>
    </Card>
  );
}
