/**
 * ShakedownExpertiseSection Component
 *
 * Feature: 001-community-shakedowns
 * Task: T071
 *
 * Displays shakedown-related stats and badges on user profile:
 * - Shakedowns created count
 * - Shakedowns reviewed count
 * - Helpful votes received
 * - Earned expertise badges
 */

'use client';

import { useTranslations } from 'next-intl';
import { MessageSquare, Award, ThumbsUp, FileEdit } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpertBadge } from '@/components/shakedowns/ExpertBadge';
import { useBadges } from '@/hooks/shakedowns/useBadges';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ShakedownStats {
  /** Number of shakedowns created by the user */
  shakedownsCreated: number;
  /** Number of shakedowns reviewed (feedback provided) */
  shakedownsReviewed: number;
  /** Total helpful votes received for feedback */
  helpfulVotesReceived: number;
}

interface ShakedownExpertiseSectionProps {
  /** User ID for fetching badges */
  userId: string;
  /** Shakedown statistics */
  stats: ShakedownStats;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Stat Item Component
// =============================================================================

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="text-primary/70 mb-1">{icon}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ShakedownExpertiseSection({
  userId,
  stats,
  className,
}: ShakedownExpertiseSectionProps) {
  const t = useTranslations('Profile.shakedownExpertise');
  const { badges, isLoading: badgesLoading } = useBadges(userId);

  // Don't render if user has no shakedown activity
  const hasActivity =
    stats.shakedownsCreated > 0 ||
    stats.shakedownsReviewed > 0 ||
    stats.helpfulVotesReceived > 0;

  if (!hasActivity && badges.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Award className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <StatItem
            icon={<FileEdit className="h-5 w-5" />}
            value={stats.shakedownsCreated}
            label={t('created')}
          />
          <StatItem
            icon={<MessageSquare className="h-5 w-5" />}
            value={stats.shakedownsReviewed}
            label={t('reviewed')}
          />
          <StatItem
            icon={<ThumbsUp className="h-5 w-5" />}
            value={stats.helpfulVotesReceived}
            label={t('helpful')}
          />
        </div>

        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex flex-wrap gap-2 justify-center">
              {badges.map((badge) => (
                <ExpertBadge
                  key={badge.id}
                  badge={badge.badgeType}
                  size="sm"
                  showLabel
                  showTooltip
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading state for badges */}
        {badgesLoading && badges.length === 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex justify-center">
              <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ShakedownExpertiseSection;
