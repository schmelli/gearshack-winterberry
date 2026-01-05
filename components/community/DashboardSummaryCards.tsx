/**
 * Dashboard Summary Cards Component
 *
 * Feature: Community Section Restructure
 *
 * Displays summary statistics for the community dashboard:
 * - Recent Shakedowns (last 7 days)
 * - New Marketplace Listings (last 7 days)
 * - Wiki Updates (placeholder)
 */

'use client';

import { useTranslations } from 'next-intl';
import { Scale, ShoppingBag, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { useDashboardSummary } from '@/hooks/community/useDashboardSummary';

interface SummaryCardProps {
  title: string;
  count: number;
  description: string;
  href: string;
  icon: React.ReactNode;
  isLoading: boolean;
}

function SummaryCard({
  title,
  count,
  description,
  href,
  icon,
  isLoading,
}: SummaryCardProps) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold mt-1">{count}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardSummaryCards() {
  const t = useTranslations('Community.dashboard');
  const { summary, isLoading } = useDashboardSummary();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard
        title={t('recentShakedowns.title')}
        count={summary.recentShakedowns}
        description={t('recentShakedowns.description')}
        href="/community/shakedowns"
        icon={<Scale className="h-5 w-5" />}
        isLoading={isLoading}
      />
      <SummaryCard
        title={t('newListings.title')}
        count={summary.newListings}
        description={t('newListings.description')}
        href="/community/marketplace"
        icon={<ShoppingBag className="h-5 w-5" />}
        isLoading={isLoading}
      />
      <SummaryCard
        title={t('wikiUpdates.title')}
        count={summary.wikiUpdates}
        description={t('wikiUpdates.description')}
        href="/community/wiki"
        icon={<BookOpen className="h-5 w-5" />}
        isLoading={isLoading}
      />
    </div>
  );
}
