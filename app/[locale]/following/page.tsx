/**
 * Following Page
 *
 * Feature: 001-social-graph
 * Task: T025
 *
 * Displays the list of users the current user is following.
 * Protected route - requires authentication.
 *
 * Features:
 * - Paginated list of followed users
 * - Search/filter functionality
 * - One-click unfollow
 * - Empty state with discover CTA
 */

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FollowingList } from '@/components/social/FollowingList';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

// =============================================================================
// Page Content
// =============================================================================

function FollowingPageContent() {
  const t = useTranslations('Social');
  const router = useRouter();

  const handleDiscoverClick = () => {
    // Navigate to discover/community page when it exists
    // For now, could navigate to messages or search
    router.push('/inventory'); // Placeholder - will be /community or /discover
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('following.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('following.pageDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Following List */}
      <FollowingList
        showSearch
        onDiscoverClick={handleDiscoverClick}
      />

      {/* Footer actions */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={handleDiscoverClick}>
          <Users className="mr-2 h-4 w-4" />
          {t('following.discoverPeople')}
        </Button>
      </div>
    </main>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function FollowingPage() {
  return (
    <ProtectedRoute>
      <FollowingPageContent />
    </ProtectedRoute>
  );
}
