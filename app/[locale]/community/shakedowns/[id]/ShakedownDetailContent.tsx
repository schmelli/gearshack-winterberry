'use client';

/**
 * ShakedownDetailContent Component
 *
 * Feature: 001-community-shakedowns
 * Task: T035
 *
 * Client component for the shakedown detail page.
 * Handles:
 * - Share token extraction from URL
 * - Breadcrumb navigation
 * - ShakedownDetail component rendering
 *
 * Architecture: Feature-Sliced Light
 * - Data fetching delegated to ShakedownDetail component via useShakedown hook
 * - This component handles page layout and breadcrumbs
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { ShakedownDetail } from '@/components/shakedowns/ShakedownDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// =============================================================================
// Types
// =============================================================================

interface ShakedownDetailContentProps {
  shakedownId: string | null;
}

// =============================================================================
// Breadcrumb Navigation
// =============================================================================

function Breadcrumbs() {
  const t = useTranslations('Shakedowns');
  const tNav = useTranslations('Navigation');

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground mb-6"
    >
      <Link
        href="/community"
        className="hover:text-foreground transition-colors"
      >
        {tNav('community')}
      </Link>
      <ChevronRight className="h-4 w-4 flex-shrink-0" />
      <Link
        href="/community/shakedowns"
        className="hover:text-foreground transition-colors"
      >
        {t('title')}
      </Link>
    </nav>
  );
}

// =============================================================================
// Back Navigation
// =============================================================================

function BackLink() {
  const t = useTranslations('Shakedowns');

  return (
    <Button variant="ghost" size="sm" asChild className="mt-6">
      <Link href="/community/shakedowns">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('allShakedowns')}
      </Link>
    </Button>
  );
}

// =============================================================================
// Loading State
// =============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// =============================================================================
// Error State (for null shakedownId from server)
// =============================================================================

function NotFoundState() {
  const t = useTranslations('Shakedowns');

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="font-semibold text-lg mb-2">{t('errors.notFound')}</h2>
          <p className="text-muted-foreground text-sm">
            {t('noShakedownsDescription')}
          </p>
        </div>
        <BackLink />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Content Component (with Suspense boundary for useSearchParams)
// =============================================================================

function ShakedownDetailPageContent({ shakedownId }: ShakedownDetailContentProps) {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('shareToken') ?? undefined;

  // Handle invalid shakedown ID (null passed from server)
  if (shakedownId === null) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Breadcrumbs />
        <NotFoundState />
      </div>
    );
  }

  // Render ShakedownDetail which handles its own data fetching, loading, and error states
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs />

      <ShakedownDetail
        shakedownId={shakedownId}
        shareToken={shareToken}
      />

      <div className="flex justify-center">
        <BackLink />
      </div>
    </div>
  );
}

// =============================================================================
// Exported Component with Suspense Boundary
// =============================================================================

export function ShakedownDetailContent({ shakedownId }: ShakedownDetailContentProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <Breadcrumbs />
          <LoadingState />
        </div>
      }
    >
      <ShakedownDetailPageContent shakedownId={shakedownId} />
    </Suspense>
  );
}

export default ShakedownDetailContent;
