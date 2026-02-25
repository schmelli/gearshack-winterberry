/**
 * Match Confirmation Dialog Component (Stateless UI)
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { FuzzyMatch } from '@/types/price-tracking';

interface MatchConfirmationDialogProps {
  isOpen: boolean;
  matches: FuzzyMatch[];
  onConfirm: (match: FuzzyMatch) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function MatchConfirmationDialog({
  isOpen,
  matches,
  onConfirm,
  onSkip,
  onClose,
}: MatchConfirmationDialogProps) {
  const t = useTranslations('Wishlist.matchConfirmation');
  const locale = useLocale();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getConfidenceColor = (similarity: number) => {
    if (similarity > 0.7) return 'bg-green-500';
    if (similarity > 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {matches.map((match, index) => (
            <Card
              key={index}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => onConfirm(match)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{match.product_name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {match.source_name}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">{formatPrice(match.price_amount)}</p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getConfidenceColor(match.similarity)}`}
                    >
                      {t('matchPercent', { score: Math.round(match.similarity * 100) })}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onSkip}>
            {t('skip')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
