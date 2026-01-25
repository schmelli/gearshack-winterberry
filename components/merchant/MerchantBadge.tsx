/**
 * MerchantBadge Component
 *
 * Feature: 053-merchant-integration
 * Task: T016
 *
 * Displays merchant verification status and business type indicators.
 * Used across merchant portal and public-facing pages.
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Store, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { MerchantBusinessType, MerchantSummary } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface MerchantBadgeProps {
  /** Whether merchant is verified (approved + verification date set) */
  isVerified?: boolean;
  /** Business type for icon selection */
  businessType?: MerchantBusinessType;
  /** Show label text (default: false) */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

export interface MerchantInfoBadgeProps {
  merchant: MerchantSummary;
  showBusinessType?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CLASSES = {
  sm: {
    icon: 'h-3 w-3',
    badge: 'text-xs px-1.5 py-0.5',
    gap: 'gap-1',
  },
  md: {
    icon: 'h-4 w-4',
    badge: 'text-sm px-2 py-1',
    gap: 'gap-1.5',
  },
  lg: {
    icon: 'h-5 w-5',
    badge: 'text-base px-2.5 py-1.5',
    gap: 'gap-2',
  },
};

const BUSINESS_TYPE_ICONS: Record<MerchantBusinessType, typeof Store> = {
  local: Store,
  chain: Building2,
  online: Globe,
};

// =============================================================================
// Components
// =============================================================================

/**
 * Verified badge indicator
 */
export const VerifiedBadge = memo(function VerifiedBadge({
  isVerified = false,
  showLabel = false,
  size = 'md',
  className,
}: Omit<MerchantBadgeProps, 'businessType'>) {
  const t = useTranslations('Merchant.badge');
  if (!isVerified) return null;

  const sizeClasses = SIZE_CLASSES[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn(
              'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
              sizeClasses.badge,
              sizeClasses.gap,
              'inline-flex items-center',
              className
            )}
          >
            <BadgeCheck className={cn(sizeClasses.icon, 'text-blue-600 dark:text-blue-400')} />
            {showLabel && <span>{t('verified')}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('verifiedTooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Business type badge indicator
 */
export const BusinessTypeBadge = memo(function BusinessTypeBadge({
  businessType = 'local',
  showLabel = false,
  size = 'md',
  className,
}: Omit<MerchantBadgeProps, 'isVerified'>) {
  const t = useTranslations('Merchant.badge.businessTypes');
  const sizeClasses = SIZE_CLASSES[size];
  const Icon = BUSINESS_TYPE_ICONS[businessType];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              sizeClasses.badge,
              sizeClasses.gap,
              'inline-flex items-center',
              className
            )}
          >
            <Icon className={sizeClasses.icon} />
            {showLabel && <span>{t(businessType)}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t(`${businessType}Description`)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Combined merchant badge showing verification and business type
 */
export const MerchantBadge = memo(function MerchantBadge({
  isVerified = false,
  businessType = 'local',
  showLabel = false,
  size = 'md',
  className,
}: MerchantBadgeProps) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <BusinessTypeBadge businessType={businessType} showLabel={showLabel} size={size} />
      <VerifiedBadge isVerified={isVerified} showLabel={showLabel} size={size} />
    </div>
  );
});

/**
 * Full merchant info badge with name and indicators
 */
export function MerchantInfoBadge({
  merchant,
  showBusinessType = true,
  size = 'md',
  className,
}: MerchantInfoBadgeProps) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={cn('inline-flex items-center', sizeClasses.gap, className)}>
      {merchant.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={merchant.logoUrl}
          alt={merchant.businessName}
          className={cn(
            'rounded-full object-cover',
            size === 'sm' && 'h-5 w-5',
            size === 'md' && 'h-6 w-6',
            size === 'lg' && 'h-8 w-8'
          )}
        />
      )}
      <span className={cn('font-medium', size === 'sm' && 'text-sm', size === 'lg' && 'text-lg')}>
        {merchant.businessName}
      </span>
      {merchant.isVerified && <VerifiedBadge isVerified size={size} />}
      {showBusinessType && (
        <BusinessTypeBadge businessType={merchant.businessType} size={size} />
      )}
    </div>
  );
}

// =============================================================================
// Status Badges
// =============================================================================

export interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_STYLES: Record<StatusBadgeProps['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rejected: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export function MerchantStatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const t = useTranslations('Merchant.badge.status');
  const sizeClasses = SIZE_CLASSES[size];
  const styleClass = STATUS_STYLES[status];

  return (
    <Badge
      variant="secondary"
      className={cn(sizeClasses.badge, styleClass, className)}
    >
      {t(status)}
    </Badge>
  );
}

export default MerchantBadge;
