'use client';

/**
 * NewShakedownContent Component
 *
 * Feature: 001-community-shakedowns
 * Task: T021
 *
 * Client component for the shakedown creation page.
 * Handles loadout selection and shakedown form display.
 *
 * Features:
 * - Pre-select loadout via ?loadoutId query parameter
 * - Loadout selector grid when no loadoutId provided
 * - Breadcrumb navigation
 * - Responsive layout (mobile/desktop)
 */

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  ChevronRight,
  Package,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

import { ShakedownCreator } from '@/components/shakedowns/ShakedownCreator';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useLoadouts, type Loadout } from '@/hooks/useLoadouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Shakedown } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface LoadoutSelectorProps {
  loadouts: Loadout[];
  isLoading: boolean;
  onSelect: (loadout: Loadout) => void;
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
      <ChevronRight className="h-4 w-4" />
      <Link
        href="/community/shakedowns"
        className="hover:text-foreground transition-colors"
      >
        {t('title')}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">
        {t('requestShakedown')}
      </span>
    </nav>
  );
}

// =============================================================================
// Loadout Card for Selection
// =============================================================================

function LoadoutCard({
  loadout,
  onSelect,
}: {
  loadout: Loadout;
  onSelect: () => void;
}) {
  const t = useTranslations('Loadouts');

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm"
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-label={`Select loadout: ${loadout.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{loadout.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            <span>{t('itemCount', { count: loadout.items.length })}</span>
          </div>
        </div>
        {loadout.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {loadout.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Loadout Selector Grid
// =============================================================================

function LoadoutSelector({ loadouts, isLoading, onSelect }: LoadoutSelectorProps) {
  const t = useTranslations('Shakedowns');
  const tNav = useTranslations('Navigation');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">{t('loadMore')}</p>
      </div>
    );
  }

  if (loadouts.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Package className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{t('noLoadouts')}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t('createLoadoutFirst')}
            </p>
          </div>
          <Button asChild>
            <Link href="/loadouts/new">{tNav('loadouts')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">{t('selectLoadout')}</h2>
        <p className="text-muted-foreground">{t('selectLoadoutDescription')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loadouts.map((loadout) => (
          <LoadoutCard
            key={loadout.id}
            loadout={loadout}
            onSelect={() => onSelect(loadout)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Content Component (with Suspense boundary for useSearchParams)
// =============================================================================

function NewShakedownPageContent() {
  const t = useTranslations('Shakedowns');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthContext();

  // Get loadouts for current user
  const { loadouts, isLoading } = useLoadouts(user?.uid ?? null);

  // State for manually selected loadout (user clicked on a card)
  const [manuallySelectedId, setManuallySelectedId] = useState<string | null>(null);

  // Check for pre-selected loadout from URL
  const loadoutIdParam = searchParams.get('loadoutId');

  // Derive the selected loadout from either URL param or manual selection
  // useMemo to avoid expensive finds on every render
  const selectedLoadout = useMemo(() => {
    const targetId = manuallySelectedId ?? loadoutIdParam;
    if (!targetId || loadouts.length === 0) return null;
    return loadouts.find((l) => l.id === targetId) ?? null;
  }, [manuallySelectedId, loadoutIdParam, loadouts]);

  // Handle successful shakedown creation
  const handleSuccess = (shakedown: Shakedown) => {
    // Navigate to the new shakedown detail page
    router.push(`/community/shakedowns/${shakedown.id}`);
  };

  // Handle cancel - go back to shakedowns feed
  const handleCancel = () => {
    router.push('/community/shakedowns');
  };

  // Handle loadout selection
  const handleSelectLoadout = (loadout: Loadout) => {
    setManuallySelectedId(loadout.id);
  };

  // Handle going back to loadout selection
  const handleBackToSelection = () => {
    setManuallySelectedId(null);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Breadcrumbs />

      {/* Show loadout selector if no loadout is selected */}
      {!selectedLoadout && (
        <>
          <LoadoutSelector
            loadouts={loadouts}
            isLoading={isLoading}
            onSelect={handleSelectLoadout}
          />

          {/* Back button */}
          <div className="mt-8 flex justify-center">
            <Button variant="ghost" asChild>
              <Link href="/community/shakedowns">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('allShakedowns')}
              </Link>
            </Button>
          </div>
        </>
      )}

      {/* Show form when loadout is selected */}
      {selectedLoadout && (
        <>
          {/* Back to selection (only if manually selected, not from URL param) */}
          {manuallySelectedId && !loadoutIdParam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSelection}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('selectLoadout')}
            </Button>
          )}

          <ShakedownCreator
            loadoutId={selectedLoadout.id}
            loadoutName={selectedLoadout.name}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </>
      )}
    </div>
  );
}

// =============================================================================
// Exported Component with Auth Protection
// =============================================================================

export function NewShakedownContent() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        }
      >
        <NewShakedownPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

export default NewShakedownContent;
