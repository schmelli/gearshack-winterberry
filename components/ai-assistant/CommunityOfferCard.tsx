/**
 * Community Offer Card Component
 * Feature 050: AI Assistant - T078 (adapted)
 *
 * Displays community gear matches with owner info and marketplace badges.
 * Uses Feature 049 peer-to-peer marketplace data.
 */

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Repeat, HandHeart, User, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CommunityMatch } from '@/lib/ai-assistant/community-search';

interface CommunityOfferCardProps {
  match: CommunityMatch;
  onViewProfile?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
}

export function CommunityOfferCard({
  match,
  onViewProfile,
  onSendMessage,
}: CommunityOfferCardProps) {
  const t = useTranslations('aiAssistant.community');

  const getMarketplaceBadges = () => {
    const badges = [];
    if (match.forSale) {
      badges.push(
        <Badge key="sale" variant="default" className="gap-1">
          <ShoppingCart className="h-3 w-3" />
          {t('forSale')}
        </Badge>
      );
    }
    if (match.tradeable) {
      badges.push(
        <Badge key="trade" variant="secondary" className="gap-1">
          <Repeat className="h-3 w-3" />
          {t('tradeable')}
        </Badge>
      );
    }
    if (match.lendable) {
      badges.push(
        <Badge key="lend" variant="outline" className="gap-1">
          <HandHeart className="h-3 w-3" />
          {t('lendable')}
        </Badge>
      );
    }
    return badges;
  };

  const badges = getMarketplaceBadges();
  const matchQuality = Math.round(match.similarityScore * 100);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Item Image */}
          {match.primaryImageUrl && (
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={match.primaryImageUrl}
                alt={match.itemName}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            {/* Item Name & Brand */}
            <h4 className="font-semibold text-sm truncate">{match.itemName}</h4>
            {match.itemBrand && (
              <p className="text-xs text-muted-foreground truncate">
                {match.itemBrand}
              </p>
            )}

            {/* Owner Info */}
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={match.ownerAvatarUrl || undefined} />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {match.ownerDisplayName}
              </span>
            </div>

            {/* Marketplace Badges */}
            <div className="flex flex-wrap gap-1 mt-2">{badges}</div>

            {/* Match Quality (if fuzzy search) */}
            {match.similarityScore < 1.0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {matchQuality}% {t('match')}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 border-t bg-muted/30 px-4 py-2">
          {onViewProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(match.ownerId)}
              className="flex-1 gap-2"
            >
              <User className="h-4 w-4" />
              {t('viewProfile')}
            </Button>
          )}
          {onSendMessage && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onSendMessage(match.ownerId)}
              className="flex-1 gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('sendMessage')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Community Offer List Component
 *
 * Displays multiple community matches in a scrollable list.
 */
interface CommunityOfferListProps {
  matches: CommunityMatch[];
  onViewProfile?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
  emptyMessage?: string;
}

export function CommunityOfferList({
  matches,
  onViewProfile,
  onSendMessage,
  emptyMessage,
}: CommunityOfferListProps) {
  const t = useTranslations('aiAssistant.community');

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {emptyMessage || t('noMatches')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <CommunityOfferCard
          key={match.matchedItemId}
          match={match}
          onViewProfile={onViewProfile}
          onSendMessage={onSendMessage}
        />
      ))}
    </div>
  );
}
