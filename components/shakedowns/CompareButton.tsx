/**
 * CompareButton Component
 *
 * Feature: Shakedown Detail Enhancement - Side-by-Side Gear Comparison
 *
 * Toggle button for entering/exiting comparison mode.
 */

'use client';

import { useTranslations } from 'next-intl';
import { GitCompare, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

interface CompareButtonProps {
  /** Whether comparison mode is active */
  isActive: boolean;
  /** Number of selected items */
  selectedCount: number;
  /** Maximum items allowed */
  maxItems: number;
  /** Click handler */
  onClick: () => void;
  /** Size variant */
  size?: 'default' | 'sm' | 'lg';
  /** Additional className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CompareButton({
  isActive,
  selectedCount,
  maxItems,
  onClick,
  size = 'default',
  className,
}: CompareButtonProps): React.ReactElement {
  const t = useTranslations('Shakedowns.comparison');

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size={size}
      onClick={onClick}
      className={cn('gap-2', className)}
    >
      {isActive ? (
        <>
          <X className="size-4" />
          {t('exitCompare')}
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedCount}/{maxItems}
            </Badge>
          )}
        </>
      ) : (
        <>
          <GitCompare className="size-4" />
          {t('compare')}
        </>
      )}
    </Button>
  );
}

export default CompareButton;
