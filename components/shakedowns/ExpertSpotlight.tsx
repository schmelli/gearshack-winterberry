/**
 * ExpertSpotlight Component
 *
 * Feature: Shakedown Detail Enhancement - Expert Trust Score System
 *
 * Displays the top reviewers for a shakedown with their expertise badges.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Award, Medal, Star, Sparkles } from 'lucide-react';

import type { FeedbackNode, ShakedownBadge } from '@/types/shakedown';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { ExpertBadge } from './ExpertBadge';
import { TrustScoreIndicator } from './TrustScoreIndicator';

// =============================================================================
// Types
// =============================================================================

interface ExpertSpotlightProps {
  /** Feedback tree to analyze for top reviewers */
  feedbackTree: FeedbackNode[];
  /** Maximum number of experts to show */
  maxExperts?: number;
  /** Show as compact inline badges */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

interface TopReviewer {
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorReputation: number;
  feedbackCount: number;
  helpfulCount: number;
  badge: ShakedownBadge | null;
  trustScore: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getBadgeFromReputation(reputation: number): ShakedownBadge | null {
  if (reputation >= 100) return 'community_legend';
  if (reputation >= 50) return 'trail_expert';
  if (reputation >= 10) return 'shakedown_helper';
  return null;
}

function calculateTrustScore(
  reputation: number,
  feedbackCount: number,
  helpfulCount: number
): number {
  // Simple trust score calculation:
  // Base: reputation (max 100 contribution)
  // Bonus: feedback count (max 20 contribution)
  // Bonus: helpful count (max 30 contribution)
  const repScore = Math.min(reputation, 100) * 0.5;
  const feedbackScore = Math.min(feedbackCount * 2, 20);
  const helpfulScore = Math.min(helpfulCount * 3, 30);
  return Math.round(repScore + feedbackScore + helpfulScore);
}

// =============================================================================
// Rank Icons
// =============================================================================

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = [
  'text-amber-500',
  'text-slate-400',
  'text-amber-700',
];

// =============================================================================
// Component
// =============================================================================

export function ExpertSpotlight({
  feedbackTree,
  maxExperts = 3,
  compact = false,
  className,
}: ExpertSpotlightProps): React.ReactElement | null {
  const t = useTranslations('Shakedowns.expertSpotlight');

  // Calculate top reviewers from feedback
  const topReviewers = useMemo<TopReviewer[]>(() => {
    const reviewerMap = new Map<string, TopReviewer>();

    // Recursive function to process all feedback (including nested)
    function processFeedback(nodes: FeedbackNode[]) {
      for (const node of nodes) {
        const existing = reviewerMap.get(node.authorId);

        if (existing) {
          existing.feedbackCount += 1;
          existing.helpfulCount += node.helpfulCount;
        } else {
          reviewerMap.set(node.authorId, {
            authorId: node.authorId,
            authorName: node.authorName,
            authorAvatar: node.authorAvatar,
            authorReputation: node.authorReputation,
            feedbackCount: 1,
            helpfulCount: node.helpfulCount,
            badge: getBadgeFromReputation(node.authorReputation),
            trustScore: 0, // Calculated below
          });
        }

        // Process children recursively
        if (node.children.length > 0) {
          processFeedback(node.children);
        }
      }
    }

    processFeedback(feedbackTree);

    // Calculate trust scores and sort
    const reviewers = Array.from(reviewerMap.values());
    reviewers.forEach((r) => {
      r.trustScore = calculateTrustScore(r.authorReputation, r.feedbackCount, r.helpfulCount);
    });

    // Sort by trust score (descending), then by helpful count
    return reviewers
      .sort((a, b) => {
        if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
        return b.helpfulCount - a.helpfulCount;
      })
      .slice(0, maxExperts);
  }, [feedbackTree, maxExperts]);

  // Don't render if no reviewers
  if (topReviewers.length === 0) {
    return null;
  }

  // Compact mode: inline badges
  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-1', className)}>
          <Sparkles className="size-4 text-amber-500" />
          <span className="text-xs text-muted-foreground mr-1">{t('compactLabel')}</span>
          {topReviewers.map((reviewer, index) => (
            <Tooltip key={reviewer.authorId}>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Avatar
                    className={cn(
                      'size-6 ring-2 ring-background',
                      index > 0 && '-ml-2'
                    )}
                  >
                    {reviewer.authorAvatar ? (
                      <AvatarImage src={reviewer.authorAvatar} alt={reviewer.authorName} />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(reviewer.authorName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{reviewer.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {t('feedbackCount', { count: reviewer.feedbackCount })} • {t('trustScore', { score: reviewer.trustScore })}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  // Full card mode
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Crown className="size-5 text-amber-500" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topReviewers.map((reviewer, index) => {
            const RankIcon = RANK_ICONS[index] || Award;
            const rankColor = RANK_COLORS[index] || 'text-muted-foreground';

            return (
              <div
                key={reviewer.authorId}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
              >
                {/* Rank */}
                <div
                  className={cn(
                    'flex items-center justify-center size-6 rounded-full',
                    index === 0 && 'bg-amber-100 dark:bg-amber-900/30',
                    index === 1 && 'bg-slate-100 dark:bg-slate-800',
                    index === 2 && 'bg-amber-50 dark:bg-amber-950/30'
                  )}
                >
                  <RankIcon className={cn('size-4', rankColor)} />
                </div>

                {/* Avatar */}
                <Avatar className="size-8">
                  {reviewer.authorAvatar ? (
                    <AvatarImage src={reviewer.authorAvatar} alt={reviewer.authorName} />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {getInitials(reviewer.authorName)}
                  </AvatarFallback>
                </Avatar>

                {/* Name and stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {reviewer.authorName}
                    </span>
                    {reviewer.badge && (
                      <ExpertBadge badge={reviewer.badge} size="sm" showLabel={false} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('stats', {
                      feedback: reviewer.feedbackCount,
                      helpful: reviewer.helpfulCount,
                    })}
                  </p>
                </div>

                {/* Trust Score */}
                <TrustScoreIndicator
                  score={reviewer.trustScore}
                  size="sm"
                  showScore={true}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ExpertSpotlight;
