/**
 * SmartProductSearchButton Component
 *
 * Feature: XXX-smart-product-search
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Icon button that triggers smart product search.
 * Shows search icon, loading state, and rate limit info in tooltip.
 */

'use client';

import { Search, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';
import type { RateLimitInfo } from '@/app/actions/weight-search';

// =============================================================================
// Types
// =============================================================================

interface SmartProductSearchButtonProps {
  /** Click handler to open search modal */
  onClick: () => void;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Whether user has hit rate limit */
  isRateLimited: boolean;
  /** Rate limit information for tooltip */
  rateLimit: RateLimitInfo | null;
  /** Whether button should be disabled */
  disabled?: boolean;
  /** Current search query (for tooltip) */
  searchQuery?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SmartProductSearchButton({
  onClick,
  isSearching,
  isRateLimited,
  rateLimit,
  disabled = false,
  searchQuery = '',
}: SmartProductSearchButtonProps) {
  const t = useTranslations('GearEditor');

  /**
   * Build tooltip message based on state
   */
  const getTooltipMessage = (): string => {
    if (isRateLimited) {
      return t('productSearch.rateLimitReached');
    }

    if (disabled && !searchQuery) {
      return t('productSearch.enterProductName');
    }

    if (isSearching) {
      return t('productSearch.searching');
    }

    // Show remaining searches for free tier
    if (rateLimit && !rateLimit.isUnlimited) {
      const queryPart = searchQuery ? `"${searchQuery}"` : t('productSearch.products');
      return t('productSearch.searchWithLimit', { query: queryPart, remaining: rateLimit.remaining, limit: rateLimit.limit });
    }

    // Unlimited tier or no rate limit info yet
    const queryPart = searchQuery ? `"${searchQuery}"` : t('productSearch.products');
    return t('productSearch.searchFor', { query: queryPart });
  };

  const isDisabled = disabled || isSearching || isRateLimited;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClick}
            disabled={isDisabled}
            className="shrink-0"
            aria-label={t('productSearch.ariaLabel')}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {getTooltipMessage()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
