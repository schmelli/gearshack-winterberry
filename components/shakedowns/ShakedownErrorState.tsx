/**
 * ShakedownErrorState Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: ShakedownDetail.tsx
 *
 * Error state display for shakedown detail view.
 */

import { useTranslations } from 'next-intl';
import { AlertTriangle, Lock, RefreshCw } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type ShakedownErrorType = 'not_found' | 'forbidden' | 'network' | 'unknown';

interface ShakedownErrorStateProps {
  type: ShakedownErrorType;
  onRetry?: () => void;
}

export function ShakedownErrorState({ type, onRetry }: ShakedownErrorStateProps): React.ReactElement {
  const t = useTranslations('Shakedowns.errors');
  const tActions = useTranslations('Shakedowns.actions');

  const errorConfigs: Record<ShakedownErrorType, {
    title: string;
    description: string;
    icon: typeof AlertTriangle | typeof Lock;
    showRetry: boolean;
  }> = {
    not_found: {
      title: t('notFound'),
      description: 'The shakedown you are looking for does not exist or has been removed.',
      icon: AlertTriangle,
      showRetry: false,
    },
    forbidden: {
      title: t('forbidden'),
      description: 'You do not have permission to view this shakedown.',
      icon: Lock,
      showRetry: false,
    },
    network: {
      title: t('loadFailed'),
      description: 'A network error occurred. Please check your connection and try again.',
      icon: AlertTriangle,
      showRetry: true,
    },
    unknown: {
      title: t('loadFailed'),
      description: 'An unexpected error occurred. Please try again.',
      icon: AlertTriangle,
      showRetry: true,
    },
  };

  const config = errorConfigs[type];
  const Icon = config.icon;

  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Icon className="size-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{config.description}</p>
        {config.showRetry && onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            {tActions('retry')}
          </Button>
        )}
        <Button asChild variant="ghost" className="mt-4">
          <Link href="/community/shakedowns">Back to Shakedowns</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default ShakedownErrorState;
