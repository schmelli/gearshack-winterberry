/**
 * FeatureGate Component
 *
 * Feature: Admin Feature Activation
 *
 * Protects routes and content based on feature flags.
 * Shows a modal when a disabled feature is accessed via direct URL
 * and redirects to a fallback page.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

export interface FeatureGateProps {
  /** Feature key to check (e.g., 'community', 'messaging') */
  featureKey: string;
  /** Content to render if feature is enabled */
  children: React.ReactNode;
  /** Path to redirect to if feature is disabled (default: /inventory) */
  fallbackPath?: string;
  /** Loading component to show while checking feature flags */
  loadingComponent?: React.ReactNode;
}

export function FeatureGate({
  featureKey,
  children,
  fallbackPath = '/inventory',
  loadingComponent,
}: FeatureGateProps) {
  const router = useRouter();
  const t = useTranslations('FeatureGate');
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const featureEnabled = isFeatureEnabled(featureKey);

  useEffect(() => {
    // Only check once loading is complete
    if (isLoading) return;

    // Mark as checked
    setHasChecked(true);

    // If feature is disabled, show modal
    if (!featureEnabled) {
      setShowModal(true);
    }
  }, [isLoading, featureEnabled]);

  // Handle modal close - redirect to fallback
  const handleClose = () => {
    setShowModal(false);
    router.push(fallbackPath);
  };

  // Show loading state while checking feature flags
  if (isLoading || !hasChecked) {
    return (
      loadingComponent || (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    );
  }

  // If feature is disabled, render modal (content will be hidden)
  if (!featureEnabled) {
    return (
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {t('comingSoon')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('featureNotAvailable')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={handleClose}>
              {t('backToInventory')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Feature is enabled - render children
  return <>{children}</>;
}
