/**
 * EbayFeedbackButton Component
 *
 * Feature: 054-ebay-integration
 * Purpose: Allow users to mark eBay listings as irrelevant for ML training
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ThumbsDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { EbayListing } from '@/types/ebay';

// =============================================================================
// Types
// =============================================================================

type FeedbackType = 'irrelevant' | 'wrong_product' | 'accessory' | 'knockoff' | 'other';

interface EbayFeedbackButtonProps {
  /** The eBay listing to provide feedback on */
  listing: EbayListing;
  /** Search query that returned this listing */
  searchQuery: string;
  /** Optional gear item ID for context */
  gearItemId?: string;
  /** Brand name for context */
  brandName?: string;
  /** Item name for context */
  itemName?: string;
  /** Callback when feedback is submitted */
  onFeedbackSubmitted?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function EbayFeedbackButton({
  listing,
  searchQuery,
  gearItemId,
  brandName,
  itemName,
  onFeedbackSubmitted,
}: EbayFeedbackButtonProps) {
  const t = useTranslations('EbayListings');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackOptions: { type: FeedbackType; label: string }[] = [
    { type: 'wrong_product', label: t('feedback.wrongProduct') },
    { type: 'accessory', label: t('feedback.accessory') },
    { type: 'knockoff', label: t('feedback.knockoff') },
    { type: 'irrelevant', label: t('feedback.irrelevant') },
    { type: 'other', label: t('feedback.other') },
  ];

  const handleFeedback = async (feedbackType: FeedbackType) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ebay-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gearItemId,
          searchQuery,
          ebayItemId: listing.id,
          listingTitle: listing.title,
          listingPrice: listing.price,
          listingCurrency: listing.currency,
          listingCondition: listing.condition,
          listingUrl: listing.url,
          feedbackType,
          brandName,
          itemName,
          wasFiltered: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setIsSubmitted(true);
      toast.success(t('feedback.thankYou'));
      onFeedbackSubmitted?.();

    } catch (error) {
      console.error('[EbayFeedback] Error:', error);
      toast.error(t('feedback.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Already submitted - show checkmark
  if (isSubmitted) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-1.5 text-green-600 dark:text-green-400">
              <Check className="w-3.5 h-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t('feedback.submitted')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-40 hover:opacity-100 transition-opacity"
                disabled={isSubmitting}
                onClick={(e) => e.stopPropagation()}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ThumbsDown className="w-3.5 h-3.5" />
                )}
                <span className="sr-only">{t('feedback.tooltip')}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t('feedback.tooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-48">
        {feedbackOptions.map((option) => (
          <DropdownMenuItem
            key={option.type}
            onClick={(e) => {
              e.stopPropagation();
              handleFeedback(option.type);
            }}
            className="text-sm cursor-pointer"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
