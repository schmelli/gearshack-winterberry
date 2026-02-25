/**
 * Confirm Add to Loadout Component
 * Feature: Suspend/Resume for Human-in-the-Loop Actions
 *
 * Renders an inline confirmation card when the AI agent wants to add
 * a gear item to a loadout. The user must approve or cancel before
 * the write operation executes.
 *
 * This is the UI side of Mastra's suspend/resume pattern.
 *
 * Architecture: Stateless component (Feature-Sliced Light)
 * - Receives data via props
 * - Callbacks handled by parent (useMastraChat.resolveConfirmation)
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, PackagePlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ConfirmActionData } from '@/types/mastra';

interface ConfirmAddToLoadoutProps {
  confirmation: ConfirmActionData;
  onResolve: (runId: string, approved: boolean) => Promise<void>;
}

export function ConfirmAddToLoadout({
  confirmation,
  onResolve,
}: ConfirmAddToLoadoutProps) {
  const t = useTranslations('AIChat');
  const [status, setStatus] = useState<'pending' | 'approving' | 'cancelling' | 'resolved'>('pending');

  const handleApprove = async () => {
    setStatus('approving');
    try {
      await onResolve(confirmation.runId, true);
      setStatus('resolved');
    } catch {
      setStatus('pending');
    }
  };

  const handleCancel = async () => {
    setStatus('cancelling');
    try {
      await onResolve(confirmation.runId, false);
      setStatus('resolved');
    } catch {
      setStatus('pending');
    }
  };

  const isProcessing = status === 'approving' || status === 'cancelling';

  if (status === 'resolved') {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <PackagePlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t('confirmAction.title')}
          </p>

          <p className="text-sm text-muted-foreground">
            {t('confirmAction.addToLoadout', {
              gearItemName: confirmation.details.gearItemName,
              loadoutName: confirmation.details.loadoutName,
            })}
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              disabled={isProcessing}
              className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              {status === 'approving' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t('confirmAction.approve')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="h-8 gap-1.5"
            >
              {status === 'cancelling' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {t('confirmAction.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
