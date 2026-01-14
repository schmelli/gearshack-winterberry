/**
 * WishlistInsightDetail Component
 *
 * Feature: 053-merchant-integration
 * Task: T048
 *
 * Shows detailed view of a wishlist insight with anonymized user list
 * and proximity buckets. Allows selecting users for offer creation.
 */

'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Send,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { WishlistInsightDetail as InsightDetailType, ProximityBucket } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface WishlistInsightDetailProps {
  /** Insight detail data */
  detail: InsightDetailType | null;
  /** Loading state */
  isLoading: boolean;
  /** Back button callback */
  onBack: () => void;
  /** Create offer callback with selected user IDs */
  onCreateOffer: (userIds: string[]) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getProximityBadgeVariant(
  bucket: ProximityBucket
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (bucket) {
    case '5km':
    case '10km':
      return 'default';
    case '25km':
      return 'secondary';
    case '50km':
    case '100km+':
      return 'outline';
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// =============================================================================
// Subcomponents
// =============================================================================

interface UserRowProps {
  user: InsightDetailType['users'][0];
  isSelected: boolean;
  onToggle: (anonymousId: string) => void;
}

const UserRow = memo(function UserRow({ user, isSelected, onToggle }: UserRowProps) {
  const t = useTranslations('MerchantInsights');

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isSelected && 'bg-primary/5 border-primary',
        !user.canSendOffer && 'opacity-50'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(user.anonymousId)}
        disabled={!user.canSendOffer}
        aria-label={`Select ${user.anonymousId}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{user.anonymousId}</span>
          <Badge variant={getProximityBadgeVariant(user.proximityBucket)}>
            <MapPin className="h-3 w-3 mr-1" />
            {user.proximityBucket}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          <span>{t('addedToWishlist')} {formatDaysAgo(user.addedDaysAgo)}</span>
        </div>
      </div>

      {user.canSendOffer ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>{t('cannotSendOffer')}</span>
        </div>
      )}
    </div>
  );
});

const DetailSkeleton = memo(function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const WishlistInsightDetail = memo(function WishlistInsightDetail({
  detail,
  isLoading,
  onBack,
  onCreateOffer,
  className,
}: WishlistInsightDetailProps) {
  const t = useTranslations('MerchantInsights');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Filter users who can receive offers
  const eligibleUsers = useMemo(
    () => detail?.users.filter((u) => u.canSendOffer) ?? [],
    [detail?.users]
  );

  const toggleUser = useCallback((anonymousId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(anonymousId)) {
        next.delete(anonymousId);
      } else {
        next.add(anonymousId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedUsers(new Set(eligibleUsers.map((u) => u.anonymousId)));
  }, [eligibleUsers]);

  const deselectAll = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  const handleCreateOffer = useCallback(() => {
    onCreateOffer(Array.from(selectedUsers));
  }, [onCreateOffer, selectedUsers]);

  // Calculate proximity groups (must be before early returns per rules-of-hooks)
  type UserEntry = InsightDetailType['users'][number];
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- using detail?.users is intentional; recalc only needed when users array changes
  const proximityGroups = useMemo(() => {
    const emptyGroups: Record<ProximityBucket, UserEntry[]> = {
      '5km': [],
      '10km': [],
      '25km': [],
      '50km': [],
      '100km+': [],
    };
    if (!detail?.users) {
      return emptyGroups;
    }
    const groups: Record<ProximityBucket, UserEntry[]> = {
      '5km': [],
      '10km': [],
      '25km': [],
      '50km': [],
      '100km+': [],
    };
    for (const user of detail.users) {
      groups[user.proximityBucket].push(user);
    }
    return groups;
  }, [detail?.users]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Button variant="ghost" size="sm" disabled>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
        <DetailSkeleton />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={cn('space-y-4', className)}>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t('noDetailAvailable')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('back')}
      </Button>

      {/* Product Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
              {detail.catalogItem.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={detail.catalogItem.imageUrl}
                  alt={detail.catalogItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{detail.catalogItem.name}</h2>
              {detail.catalogItem.brand && (
                <p className="text-sm text-muted-foreground">{detail.catalogItem.brand}</p>
              )}
              <p className="text-lg font-medium mt-1">
                {formatPrice(detail.catalogItem.price)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-semibold">{detail.users.length}</p>
            <p className="text-xs text-muted-foreground">{t('totalUsers')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-semibold">{eligibleUsers.length}</p>
            <p className="text-xs text-muted-foreground">{t('eligible')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-semibold">
              {proximityGroups['5km'].length + proximityGroups['10km'].length}
            </p>
            <p className="text-xs text-muted-foreground">{t('within10km')}</p>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t('usersWithItem')} ({detail.users.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {t('selectAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                {t('deselectAll')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.users.map((user) => (
            <UserRow
              key={user.anonymousId}
              user={user}
              isSelected={selectedUsers.has(user.anonymousId)}
              onToggle={toggleUser}
            />
          ))}
        </CardContent>
      </Card>

      {/* Create Offer Button */}
      <div className="sticky bottom-4 bg-background/95 backdrop-blur p-4 -mx-4 border-t">
        <Button
          className="w-full"
          size="lg"
          disabled={selectedUsers.size === 0}
          onClick={handleCreateOffer}
        >
          <Send className="h-4 w-4 mr-2" />
          {t('createOffer', { count: selectedUsers.size })}
        </Button>
      </div>
    </div>
  );
});
