'use client';

/**
 * Tag Filter Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T029
 *
 * Category tag chips for filtering posts.
 * Shows all tags with active state highlighting.
 */

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { POST_TAGS, type PostTag } from '@/types/bulletin';

interface TagFilterProps {
  activeTag: PostTag | null;
  onTagChange: (tag: PostTag | null) => void;
  className?: string;
}

export function TagFilter({ activeTag, onTagChange, className }: TagFilterProps) {
  const t = useTranslations('bulletin');

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {/* All posts button */}
      <Button
        variant={activeTag === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onTagChange(null)}
        className="text-sm"
      >
        {t('tags.all')}
      </Button>

      {/* Tag chips */}
      {POST_TAGS.map((tag) => (
        <Button
          key={tag.value}
          variant={activeTag === tag.value ? 'default' : 'outline'}
          size="sm"
          onClick={() =>
            onTagChange(activeTag === tag.value ? null : tag.value)
          }
          className="text-sm"
        >
          {t(tag.labelKey)}
        </Button>
      ))}

      {/* Clear filter indicator */}
      {activeTag && (
        <Badge
          variant="secondary"
          className="ml-2 flex items-center gap-1 text-xs"
        >
          {t('filter.activeFilter', { tag: t(`tags.${activeTag.replace('_', '')}`) })}
          <button
            onClick={() => onTagChange(null)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
            aria-label={t('filter.clearFilter')}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
