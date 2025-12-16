/**
 * Upgrade Modal Component
 * Feature 050: AI Assistant - T024
 *
 * Modal shown to standard users when they click the AI Assistant button.
 * Displays feature highlights, example questions, and CTA to upgrade.
 */

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare, Zap, TrendingDown, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function UpgradeModal({ open, onClose, onUpgrade }: UpgradeModalProps) {
  const t = useTranslations('aiAssistant.upgradeModal');

  const features = [
    {
      icon: MessageSquare,
      titleKey: 'features.instantAnswers.title',
      descriptionKey: 'features.instantAnswers.description',
    },
    {
      icon: TrendingDown,
      titleKey: 'features.weightOptimization.title',
      descriptionKey: 'features.weightOptimization.description',
    },
    {
      icon: Zap,
      titleKey: 'features.smartRecommendations.title',
      descriptionKey: 'features.smartRecommendations.description',
    },
  ];

  const exampleQuestions = [
    'exampleQuestions.baseWeight',
    'exampleQuestions.lighterTent',
    'exampleQuestions.rValue',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {t('headline')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feature Highlights */}
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t(feature.descriptionKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Example Questions */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {t('exampleQuestionsHeadline')}
            </h3>
            <div className="space-y-2">
              {exampleQuestions.map((questionKey, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  "{t(questionKey)}"
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            size="lg"
          >
            {t('ctaButton')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {/* Subtle close option */}
          <button
            onClick={onClose}
            className="mx-auto block text-sm text-muted-foreground hover:underline"
          >
            {t('maybeLater')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
