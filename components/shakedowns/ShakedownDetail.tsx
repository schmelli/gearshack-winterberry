/**
 * ShakedownDetail Component
 *
 * Feature: 001-community-shakedowns
 * Tasks: T033, T075
 *
 * Main component for viewing a shakedown's full details including:
 * - Header with trip name, dates, author info, status, and privacy indicator
 * - Trip context (experience level, concerns)
 * - Embedded loadout view with gear items
 * - Feedback section with threaded replies
 * - Owner actions (edit, complete, archive, delete, share to bulletin)
 *
 * T075: Share to Bulletin Board functionality
 * - Only available for public shakedowns with 'open' status
 * - Creates a bulletin post with linked content type 'shakedown'
 * - Prevents duplicate shares by checking existing bulletin posts
 * - Uses usePosts hook for post creation with optimistic updates
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Calendar, Copy, MessageSquare, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

import type { FeedbackNode } from '@/types/shakedown';
import { useShakedown } from '@/hooks/shakedowns';
import { useShakedownMutations } from '@/hooks/shakedowns';
import { usePosts } from '@/hooks/bulletin/usePosts';
import { fetchBulletinPosts } from '@/lib/supabase/bulletin-queries';
import { createClient } from '@/lib/supabase/client';
import { formatShakedownDateRange, daysUntilArchive, canAddFeedback } from '@/lib/shakedown-utils';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { ShakedownDetailSkeleton } from './ShakedownDetailSkeleton';
import { ShakedownErrorState } from './ShakedownErrorState';
import { PrivacyIndicator } from './PrivacyIndicator';
import { TripContext } from './TripContext';
import { LoadoutDisplay, type SelectedGearItem } from './LoadoutDisplay';
import { OwnerActions } from './OwnerActions';
import { ShakedownFeedbackSection } from './ShakedownFeedbackSection';
import { StatusBadge } from './StatusBadge';
import { ItemFeedbackModal } from './ItemFeedbackModal';
import { CompletionModal } from './CompletionModal';

// =============================================================================
// Types
// =============================================================================

interface ShakedownDetailProps {
  /** The shakedown ID to display */
  shakedownId: string;
  /** Optional share token for accessing private shakedowns */
  shareToken?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// =============================================================================
// Main Component
// =============================================================================

export function ShakedownDetail({ shakedownId, shareToken }: ShakedownDetailProps): React.ReactElement {
  const t = useTranslations('Shakedowns');
  const tActions = useTranslations('Shakedowns.actions');
  const tDetail = useTranslations('Shakedowns.detail');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { user, profile: authProfile } = useAuthContext();

  const { shakedown, loadout, gearItems, feedbackTree, isLoading, error, refresh, isOwner } =
    useShakedown(shakedownId, shareToken);

  const { completeShakedown, reopenShakedown, isCompleting, isReopening } = useShakedownMutations();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isAlreadyShared, setIsAlreadyShared] = useState(false);
  const { createPost } = usePosts();

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedGearItem | null>(null);

  // Format date range
  const dateRange = useMemo(() => {
    if (!shakedown) return '';
    return formatShakedownDateRange(shakedown.tripStartDate, shakedown.tripEndDate, locale);
  }, [shakedown, locale]);

  // Calculate days until archive for completed shakedowns
  const archiveDays = useMemo(() => {
    if (!shakedown?.completedAt) return null;
    return daysUntilArchive(shakedown.completedAt);
  }, [shakedown?.completedAt]);

  // Check if feedback can be added
  const canAdd = useMemo(() => {
    if (!shakedown) return false;
    return canAddFeedback(shakedown.status);
  }, [shakedown]);

  // Filter feedback for selected item
  const itemFeedback = useMemo(() => {
    if (!selectedItem) return [];
    return feedbackTree.filter((f) => f.gearItemId === selectedItem.id);
  }, [selectedItem, feedbackTree]);

  // Flatten feedback tree for CompletionModal
  const flattenedFeedback = useMemo(() => {
    function flatten(nodes: FeedbackNode[]): FeedbackNode[] {
      const result: FeedbackNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0) {
          result.push(...flatten(node.children));
        }
      }
      return result;
    }
    return flatten(feedbackTree);
  }, [feedbackTree]);

  // Check if shakedown is already shared to bulletin board
  useEffect(() => {
    async function checkIfAlreadyShared() {
      if (!shakedown || !isOwner || !user) return;

      try {
        const supabase = createClient();
        const result = await fetchBulletinPosts(supabase, { limit: 50 });
        const alreadyShared = result?.posts?.some(
          (post) =>
            post.linked_content_type === 'shakedown' &&
            post.linked_content_id === shakedown.id &&
            post.author_id === user.uid
        ) ?? false;
        setIsAlreadyShared(alreadyShared);
      } catch {
        setIsAlreadyShared(false);
      }
    }

    checkIfAlreadyShared();
  }, [shakedown, isOwner, user]);

  // Handle share to bulletin board
  const handleShareToBulletin = useCallback(async () => {
    if (!shakedown || !user) return;

    if (shakedown.privacy !== 'public' || shakedown.status !== 'open') {
      toast.error(t('errors.cannotShare'));
      return;
    }

    setIsSharing(true);
    try {
      const authorName = authProfile?.profile?.displayName ?? user.displayName ?? tCommon('genericUser');
      const authorAvatar = authProfile?.profile?.avatarUrl ?? user.photoURL ?? null;

      const result = await createPost(
        {
          content: `Check out my loadout shakedown: "${shakedown.tripName}" - Looking for feedback!`,
          tag: 'shakedown',
          linked_content_type: 'shakedown',
          linked_content_id: shakedown.id,
        },
        { name: authorName, avatar: authorAvatar }
      );

      if (result) {
        setIsAlreadyShared(true);
        toast.success(t('success.sharedToBulletin'));
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        const postError = error as { type: string; message: string };
        if (postError.type === 'duplicate') {
          setIsAlreadyShared(true);
          toast.info(tActions('alreadyShared'));
        } else {
          toast.error(postError.message);
        }
      } else {
        toast.error(t('errors.shareFailed'));
      }
    } finally {
      setIsSharing(false);
    }
  }, [shakedown, user, authProfile, createPost, t, tActions, tCommon]);

  const handleItemClick = useCallback((item: SelectedGearItem) => {
    setSelectedItem(item);
  }, []);

  const handleOpenCompletionModal = useCallback(() => {
    setShowCompletionModal(true);
  }, []);

  const handleCompleteConfirm = useCallback(
    async (helpfulFeedbackIds: string[]) => {
      if (!shakedown) return;
      const { error: completeError } = await completeShakedown(shakedown.id, helpfulFeedbackIds);
      if (completeError) {
        toast.error(t('errors.completeFailed'));
        return;
      }
      toast.success(t('success.completed'));
      setShowCompletionModal(false);
      refresh();
    },
    [shakedown, completeShakedown, refresh, t]
  );

  const handleReopen = useCallback(async () => {
    if (!shakedown) return;
    const { error: reopenError } = await reopenShakedown(shakedown.id);
    if (reopenError) {
      toast.error(t('errors.reopenFailed'));
      return;
    }
    toast.success(t('success.reopened'));
    refresh();
  }, [shakedown, reopenShakedown, refresh, t]);

  const handleArchive = useCallback(async () => {
    if (!shakedown) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/shakedowns/${shakedown.id}/archive`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to archive shakedown');
      toast.success(tActions('archiveSuccess'));
      refresh();
    } catch {
      toast.error(tActions('archiveFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [shakedown, refresh, tActions]);

  const handleDelete = useCallback(async () => {
    if (!shakedown) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/shakedowns/${shakedown.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete shakedown');
      toast.success(tActions('deleteSuccess'));
      router.push('/community/shakedowns');
    } catch {
      toast.error(tActions('deleteFailed'));
      setIsProcessing(false);
    }
  }, [shakedown, router, tActions]);

  // Loading state
  if (isLoading) {
    return <ShakedownDetailSkeleton />;
  }

  // Error states
  if (error) {
    return <ShakedownErrorState type={error.type} onRetry={refresh} />;
  }

  // Not loaded / not found
  if (!shakedown) {
    return <ShakedownErrorState type="not_found" />;
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Left: Main info */}
            <div className="space-y-3 flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{shakedown.tripName}</h1>

              {/* Author info */}
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {shakedown.authorAvatar && (
                    <AvatarImage src={shakedown.authorAvatar} alt={shakedown.authorName} />
                  )}
                  <AvatarFallback>{getAuthorInitials(shakedown.authorName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{shakedown.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tDetail('postedBy', { author: shakedown.authorName })}
                  </p>
                </div>
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <span>{dateRange}</span>
              </div>
            </div>

            {/* Right: Status, badges, actions */}
            <div className="flex flex-col items-start gap-3 md:items-end shrink-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={shakedown.status} showDescription />
                <PrivacyIndicator privacy={shakedown.privacy} />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5" title="Feedback count">
                  <MessageSquare className="size-4" />
                  <span>{shakedown.feedbackCount}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Helpful votes">
                  <ThumbsUp className="size-4" />
                  <span>{shakedown.helpfulCount}</span>
                </div>
              </div>

              {/* Archive countdown */}
              {archiveDays !== null && archiveDays > 0 && (
                <p className="text-xs text-muted-foreground">
                  {tDetail('daysUntilArchive', { days: archiveDays })}
                </p>
              )}

              {/* Owner actions */}
              {isOwner && loadout && (
                <OwnerActions
                  shakedownId={shakedown.id}
                  loadoutId={loadout.id}
                  status={shakedown.status}
                  privacy={shakedown.privacy}
                  onComplete={handleOpenCompletionModal}
                  onReopen={handleReopen}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onShareToBulletin={handleShareToBulletin}
                  isProcessing={isProcessing || isCompleting || isReopening}
                  isSharing={isSharing}
                  isAlreadyShared={isAlreadyShared}
                />
              )}

              {/* Start Similar Shakedown */}
              {user && !isOwner && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const startDate = new Date(shakedown.tripStartDate);
                        const endDate = new Date(shakedown.tripEndDate);
                        const durationDays = Math.ceil(
                          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                        );

                        const params = new URLSearchParams({
                          experience: shakedown.experienceLevel,
                          duration: String(durationDays),
                          inspired_by: shakedown.id,
                        });

                        router.push(`/community/shakedowns/new?${params.toString()}`);
                      }}
                    >
                      <Copy className="size-4" />
                      {tActions('startSimilar')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{tActions('startSimilarTooltip')}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Trip Context */}
      <TripContext experienceLevel={shakedown.experienceLevel} concerns={shakedown.concerns} />

      {/* Loadout Display */}
      {loadout && (
        <LoadoutDisplay
          loadout={loadout}
          loadoutName={shakedown.loadoutName}
          totalWeightGrams={shakedown.totalWeightGrams}
          itemCount={shakedown.itemCount}
          gearItems={gearItems}
          feedbackTree={feedbackTree}
          onItemClick={handleItemClick}
        />
      )}

      {/* Feedback Section */}
      <ShakedownFeedbackSection
        shakedownId={shakedown.id}
        feedbackTree={feedbackTree}
        shakedownOwnerId={shakedown.ownerId}
        canAddFeedback={canAdd}
        onFeedbackAdded={refresh}
      />

      {/* Item Feedback Modal */}
      {selectedItem && (
        <ItemFeedbackModal
          open={selectedItem !== null}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          shakedownId={shakedown.id}
          shakedownOwnerId={shakedown.ownerId}
          gearItem={selectedItem}
          existingFeedback={itemFeedback}
          isShakedownOpen={shakedown.status === 'open'}
          onFeedbackAdded={refresh}
        />
      )}

      {/* Completion Modal */}
      {shakedown && isOwner && (
        <CompletionModal
          open={showCompletionModal}
          onOpenChange={setShowCompletionModal}
          shakedownId={shakedown.id}
          feedbackList={flattenedFeedback}
          onComplete={handleCompleteConfirm}
          isCompleting={isCompleting}
        />
      )}
    </div>
  );
}

export default ShakedownDetail;
