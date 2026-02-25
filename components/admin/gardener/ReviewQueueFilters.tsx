/**
 * ReviewQueueFilters Component
 *
 * Extracted from ReviewQueue.tsx
 * Provides filter controls for node type and action type in the review queue.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GardenerReviewItemType } from '@/types/gardener';

// =============================================================================
// Constants
// =============================================================================

const NODE_TYPES: GardenerReviewItemType[] = [
  'GearItem',
  'Brand',
  'Category',
  'ProductFamily',
  'Technology',
  'UsageScenario',
  'Insight',
];

const ACTION_TYPES = ['enrich', 'delete', 'merge'] as const;

// =============================================================================
// Types
// =============================================================================

interface ReviewQueueFiltersProps {
  /** Current filter values */
  filters: {
    nodeType?: GardenerReviewItemType;
    action?: string;
  };
  /** Callback when a filter value changes */
  onSetFilter: (key: 'nodeType' | 'action', value: string | undefined) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ReviewQueueFilters({
  filters,
  onSetFilter,
}: ReviewQueueFiltersProps) {
  const t = useTranslations('Admin.gardener.review');

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{t('filters')}</span>

      <Select
        value={filters.nodeType || 'all'}
        onValueChange={(value) =>
          onSetFilter(
            'nodeType',
            value === 'all' ? undefined : value
          )
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('filterByType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allTypes')}</SelectItem>
          {NODE_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.action || 'all'}
        onValueChange={(value) =>
          onSetFilter('action', value === 'all' ? undefined : value)
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('filterByAction')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allActions')}</SelectItem>
          {ACTION_TYPES.map((action) => (
            <SelectItem key={action} value={action}>
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
