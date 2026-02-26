/**
 * Personal Offer Badge Component (Stateless UI)
 * Feature: 050-price-tracking (US5)
 * Date: 2025-12-17
 */

'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PersonalOfferBadgeProps {
  validUntil: string; // ISO timestamp
  className?: string;
  showCountdown?: boolean;
}

export function PersonalOfferBadge({
  validUntil,
  className = '',
  showCountdown = true,
}: PersonalOfferBadgeProps) {
  const t = useTranslations('Wishlist.personalOffer');
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!showCountdown) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiryDate = new Date(validUntil);

      // Validate date is valid
      if (isNaN(expiryDate.getTime())) {
        setTimeRemaining(t('invalidDate'));
        return;
      }

      const expiry = expiryDate.getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining(t('expired'));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 48) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(t('daysRemaining', { days }));
      } else if (hours > 0) {
        setTimeRemaining(t('hoursMinutesRemaining', { hours, minutes }));
      } else {
        setTimeRemaining(t('minutesRemaining', { minutes }));
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [validUntil, showCountdown, t]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        {t('badge')}
      </Badge>
      {showCountdown && timeRemaining && (
        <span className="text-xs text-muted-foreground">{timeRemaining}</span>
      )}
    </div>
  );
}
