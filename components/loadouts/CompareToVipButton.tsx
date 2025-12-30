'use client';

/**
 * Compare to VIP Button Component
 *
 * Feature: 052-vip-loadouts
 * Task: T069
 *
 * Button that links to VIP comparison page with the current loadout pre-selected.
 */

import { Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface CompareToVipButtonProps {
  loadoutId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CompareToVipButton({
  loadoutId,
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
  className,
}: CompareToVipButtonProps) {
  const t = useTranslations('vip.compare');

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(className)}
        asChild
      >
        <Link href={`/vip/compare?loadout=${loadoutId}`}>
          <Scale className="mr-2 h-4 w-4" />
          {t('compareToVip')}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('h-8 w-8 shrink-0', className)}
      aria-label={t('compareToVip')}
      asChild
    >
      <Link href={`/vip/compare?loadout=${loadoutId}`}>
        <Scale className="h-4 w-4" />
      </Link>
    </Button>
  );
}

export default CompareToVipButton;
