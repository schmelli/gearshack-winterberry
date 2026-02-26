/**
 * QuantityBadge Component
 *
 * Feature: 013-gear-quantity
 * Extracted from: GearCard.tsx
 *
 * Displays quantity badge for gear items with quantity > 1.
 */

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface QuantityBadgeProps {
  /** The quantity to display */
  quantity: number;
  /** Additional CSS classes */
  className?: string;
}

export function QuantityBadge({ quantity, className }: QuantityBadgeProps): React.ReactElement | null {
  const t = useTranslations('Inventory');

  if (quantity <= 1) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-slate-900/90 text-white dark:bg-slate-100/90 dark:text-slate-900',
        'shadow-sm',
        className
      )}
      title={t('quantityTooltip', { quantity })}
    >
      {t('quantityBadge', { quantity })}
    </span>
  );
}

export default QuantityBadge;
