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
import {
  Calendar,
  Globe,
  Lock,
  Users,
  Package,
  Scale,
  AlertTriangle,
  RefreshCw,
  Edit,
  CheckCircle2,
  Archive,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  Loader2,
  Copy,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';

import type { FeedbackNode, ShakedownPrivacy, ExperienceLevel } from '@/types/shakedown';
import type { Loadout } from '@/types/loadout';
import { useShakedown, type ShakedownGearItem } from '@/hooks/shakedowns';
import { useFeedback, useShakedownMutations } from '@/hooks/shakedowns';
import { usePosts } from '@/hooks/bulletin/usePosts';
import { fetchBulletinPosts } from '@/lib/supabase/bulletin-queries';
import { createClient } from '@/lib/supabase/client';
import { formatShakedownDateRange, daysUntilArchive, canAddFeedback } from '@/lib/shakedown-utils';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import { StatusBadge } from './StatusBadge';
import { FeedbackItem } from './FeedbackItem';
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

/**
 * Selected gear item for the item feedback modal
 */
interface SelectedGearItem {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
}

// =============================================================================
// Experience Level Styles
// =============================================================================

const EXPERIENCE_STYLES: Record<ExperienceLevel, string> = {
  beginner:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  intermediate:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  experienced:
    'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  expert:
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
};

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

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

// =============================================================================
// Privacy Icon Component
// =============================================================================

interface PrivacyIndicatorProps {
  privacy: ShakedownPrivacy;
}

function PrivacyIndicator({ privacy }: PrivacyIndicatorProps) {
  const t = useTranslations('Shakedowns.privacyOptions');

  const config = {
    public: {
      icon: Globe,
      label: t('public'),
      className: 'text-emerald-600 dark:text-emerald-400',
    },
    friends_only: {
      icon: Users,
      label: t('friendsOnly'),
      className: 'text-blue-600 dark:text-blue-400',
    },
    private: {
      icon: Lock,
      label: t('private'),
      className: 'text-gray-600 dark:text-gray-400',
    },
  }[privacy];

  const Icon = config.icon;

  return (
    <span className={cn('flex items-center gap-1.5 text-sm', config.className)}>
      <Icon className="size-4" />
      <span>{config.label}</span>
    </span>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function ShakedownDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loadout skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Error States
// =============================================================================

interface ErrorStateProps {
  type: 'not_found' | 'forbidden' | 'network' | 'unknown';
  onRetry?: () => void;
}

function ErrorState({ type, onRetry }: ErrorStateProps) {
  const t = useTranslations('Shakedowns.errors');
  const tActions = useTranslations('Shakedowns.actions');

  const config = {
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
  }[type];

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

// =============================================================================
// Trip Context Section
// =============================================================================

interface TripContextProps {
  experienceLevel: ExperienceLevel;
  concerns: string | null;
}

function TripContext({ experienceLevel, concerns }: TripContextProps) {
  const t = useTranslations('Shakedowns');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Trip Context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">
              {t('experienceLevel')}
            </span>
            <Badge variant="outline" className={EXPERIENCE_STYLES[experienceLevel]}>
              {t(`experience.${experienceLevel}`)}
            </Badge>
          </div>
        </div>
        {concerns && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">{t('concerns')}</span>
            <div className="max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
              {concerns}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Loadout Display Section
// =============================================================================

interface LoadoutDisplayProps {
  loadout: Loadout;
  loadoutName: string;
  totalWeightGrams: number;
  itemCount: number;
  gearItems: ShakedownGearItem[];
  feedbackTree: FeedbackNode[];
  onItemClick: (item: SelectedGearItem) => void;
}

function LoadoutDisplay({
  loadout,
  loadoutName,
  totalWeightGrams,
  itemCount,
  gearItems,
  feedbackTree,
  onItemClick,
}: LoadoutDisplayProps) {
  const t = useTranslations('Shakedowns.detail');

  // Calculate feedback count per item
  const itemFeedbackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    feedbackTree.forEach((feedback) => {
      if (feedback.gearItemId) {
        counts[feedback.gearItemId] = (counts[feedback.gearItemId] || 0) + 1;
      }
    });
    return counts;
  }, [feedbackTree]);

  // Handle item click
  const handleItemClick = useCallback(
    (item: ShakedownGearItem) => {
      onItemClick({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.productTypeId, // Using productTypeId as category for now
        weight: item.weightGrams,
        imageUrl: item.imageUrl,
      });
    },
    [onItemClick]
  );

  // Handle keyboard activation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: ShakedownGearItem) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleItemClick(item);
      }
    },
    [handleItemClick]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('loadoutInfo')}</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href={`/loadouts/${loadout.id}`}>
              {t('viewLoadout')}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <CardDescription>{loadoutName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weight and item count summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="rounded-full bg-forest-100 p-2 dark:bg-forest-900/30">
              <Scale className="size-5 text-forest-600 dark:text-forest-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalWeight')}</p>
              <p className="font-semibold">{formatWeight(totalWeightGrams)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="rounded-full bg-terracotta-100 p-2 dark:bg-terracotta-900/30">
              <Package className="size-5 text-terracotta-600 dark:text-terracotta-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-semibold">{t('itemCount', { count: itemCount })}</p>
            </div>
          </div>
        </div>

        {/* Activity types and seasons if present */}
        {((loadout.activityTypes && loadout.activityTypes.length > 0) ||
          (loadout.seasons && loadout.seasons.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {loadout.activityTypes?.map((activity) => (
              <Badge key={activity} variant="secondary" className="text-xs">
                {activity}
              </Badge>
            ))}
            {loadout.seasons?.map((season) => (
              <Badge key={season} variant="outline" className="text-xs">
                {season}
              </Badge>
            ))}
          </div>
        )}

        {/* Gear Items Grid */}
        {gearItems.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {t('clickToFeedback')}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {gearItems.map((item) => {
                  const feedbackCount = itemFeedbackCounts[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleItemClick(item)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg border p-3',
                        'cursor-pointer transition-colors',
                        'hover:bg-muted/50 hover:border-primary/30',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                      )}
                    >
                      {/* Item image or placeholder */}
                      <Avatar className="size-10 rounded-md shrink-0">
                        {item.imageUrl ? (
                          <AvatarImage
                            src={item.imageUrl}
                            alt={item.name}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-md bg-muted">
                          <Package className="size-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>

                      {/* Item details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.brand && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.brand}
                          </p>
                        )}
                        {item.weightGrams !== null && (
                          <p className="text-xs text-muted-foreground">
                            {formatWeight(item.weightGrams)}
                          </p>
                        )}
                      </div>

                      {/* Feedback indicator */}
                      {feedbackCount > 0 && (
                        <div
                          className="absolute -top-1 -right-1 flex items-center justify-center
                            size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                          title={`${feedbackCount} feedback${feedbackCount !== 1 ? 's' : ''}`}
                        >
                          {feedbackCount}
                        </div>
                      )}

                      {/* Hover indicator */}
                      <MessageSquare
                        className="size-4 text-muted-foreground/50 shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Feedback Section
// =============================================================================

interface FeedbackSectionProps {
  shakedownId: string;
  feedbackTree: FeedbackNode[];
  shakedownOwnerId: string;
  canAddFeedback: boolean;
  onFeedbackAdded: () => void;
}

function FeedbackSection({
  shakedownId,
  feedbackTree,
  shakedownOwnerId,
  canAddFeedback: canAdd,
  onFeedbackAdded,
}: FeedbackSectionProps) {
  const t = useTranslations('Shakedowns.feedback');
  const { user } = useAuthContext();
  const { createFeedback, isSubmitting } = useFeedback();

  const [newFeedback, setNewFeedback] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!newFeedback.trim() || !user) return;

    try {
      await createFeedback({
        shakedownId,
        content: newFeedback.trim(),
        parentId: replyToId ?? undefined,
      });
      setNewFeedback('');
      setReplyToId(null);
      onFeedbackAdded();
    } catch {
      // Error handled by hook with toast
    }
  }, [createFeedback, newFeedback, shakedownId, replyToId, user, onFeedbackAdded]);

  const handleReply = useCallback((parentId: string) => {
    setReplyToId(parentId);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToId(null);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-5" />
            {t('title')}
            {feedbackTree.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {feedbackTree.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add feedback form */}
        {canAdd && user && (
          <div className="space-y-3">
            {replyToId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('replyingToComment')}</span>
                <Button variant="ghost" size="sm" onClick={handleCancelReply} className="h-6 px-2">
                  {t('cancel')}
                </Button>
              </div>
            )}
            <Textarea
              placeholder={t('addPlaceholder')}
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!newFeedback.trim() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('add')
                )}
              </Button>
            </div>
          </div>
        )}

        {!user && canAdd && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{' '}
            to add feedback
          </div>
        )}

        <Separator />

        {/* Feedback tree */}
        {feedbackTree.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <p className="font-medium">{t('noFeedback')}</p>
            <p className="text-sm text-muted-foreground">{t('noFeedbackDescription')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackTree.map((feedback) => (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                shakedownOwnerId={shakedownOwnerId}
                onReply={handleReply}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Owner Actions Menu
// =============================================================================

interface OwnerActionsProps {
  shakedownId: string;
  loadoutId: string;
  status: 'open' | 'completed' | 'archived';
  privacy: ShakedownPrivacy;
  onComplete: () => void;
  onReopen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShareToBulletin: () => Promise<void>;
  isProcessing: boolean;
  isSharing: boolean;
  isAlreadyShared: boolean;
}

function OwnerActions({
  shakedownId,
  loadoutId,
  status,
  privacy,
  onComplete,
  onReopen,
  onArchive,
  onDelete,
  onShareToBulletin,
  isProcessing,
  isSharing,
  isAlreadyShared,
}: OwnerActionsProps) {
  const t = useTranslations('Shakedowns.actions');
  const tCommon = useTranslations('Common');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Determine if share to bulletin is available
  // Only public shakedowns that are open can be shared
  const canShareToBulletin = privacy === 'public' && status === 'open';

  const handleDeleteConfirm = () => {
    onDelete();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/community/shakedowns/${shakedownId}/edit`}>
              <Edit className="size-4" />
              {t('edit')}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/loadouts/${loadoutId}`}>
              <Package className="size-4" />
              {t('updateLoadout')}
            </Link>
          </DropdownMenuItem>

          {/* Share to Bulletin - only for public, open shakedowns */}
          {canShareToBulletin && (
            <DropdownMenuItem
              onClick={onShareToBulletin}
              disabled={isSharing || isAlreadyShared}
            >
              {isSharing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Megaphone className="size-4" />
              )}
              {isAlreadyShared ? t('alreadyShared') : t('shareToBulletin')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {status === 'open' && (
            <DropdownMenuItem onClick={onComplete}>
              <CheckCircle2 className="size-4" />
              {t('complete')}
            </DropdownMenuItem>
          )}

          {status === 'completed' && (
            <>
              <DropdownMenuItem onClick={onReopen}>
                <RefreshCw className="size-4" />
                {t('reopen')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="size-4" />
                Archive
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            variant="destructive"
          >
            <Trash2 className="size-4" />
            {tCommon('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteShakedown')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteShakedownConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="size-4" />
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ShakedownDetail({ shakedownId, shareToken }: ShakedownDetailProps) {
  const t = useTranslations('Shakedowns');
  const tActions = useTranslations('Shakedowns.actions');
  const tDetail = useTranslations('Shakedowns.detail');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { user, profile: authProfile } = useAuthContext();

  const { shakedown, loadout, gearItems, feedbackTree, isLoading, error, refresh, isOwner } =
    useShakedown(shakedownId, shareToken);

  // Mutations hook for complete/reopen operations
  const {
    completeShakedown,
    reopenShakedown,
    isCompleting,
    isReopening,
  } = useShakedownMutations();

  const [isProcessing, setIsProcessing] = useState(false);

  // Bulletin sharing state
  const [isSharing, setIsSharing] = useState(false);
  const [isAlreadyShared, setIsAlreadyShared] = useState(false);
  const { createPost } = usePosts();

  // State for completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // State for selected gear item (for item feedback modal)
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

  // Flatten feedback tree for CompletionModal (includes all nested replies)
  const flattenedFeedback = useMemo(() => {
    const flatten = (nodes: FeedbackNode[]): FeedbackNode[] => {
      const result: FeedbackNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0) {
          result.push(...flatten(node.children));
        }
      }
      return result;
    };
    return flatten(feedbackTree);
  }, [feedbackTree]);

  // Check if shakedown is already shared to bulletin board
  useEffect(() => {
    async function checkIfAlreadyShared() {
      if (!shakedown || !isOwner || !user) return;

      try {
        const supabase = createClient();
        // Query bulletin posts to find if this shakedown was already shared
        // Using the view which is accessible and properly typed
        const result = await fetchBulletinPosts(supabase, { limit: 50 });
        const alreadyShared = result.posts.some(
          (post) =>
            post.linked_content_type === 'shakedown' &&
            post.linked_content_id === shakedown.id &&
            post.author_id === user.uid
        );

        setIsAlreadyShared(alreadyShared);
      } catch {
        // Error checking - assume not shared
        setIsAlreadyShared(false);
      }
    }

    checkIfAlreadyShared();
  }, [shakedown, isOwner, user]);

  // Handle share to bulletin board
  const handleShareToBulletin = useCallback(async () => {
    if (!shakedown || !user) return;

    // Safety check: only public shakedowns that are open can be shared
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
      // Check for specific error types (rate limit, duplicate, banned)
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

  // Handle item click to open feedback modal
  const handleItemClick = useCallback((item: SelectedGearItem) => {
    setSelectedItem(item);
  }, []);

  // Open completion modal (triggered from OwnerActions dropdown)
  const handleOpenCompletionModal = useCallback(() => {
    setShowCompletionModal(true);
  }, []);

  // Handle completion confirmation from CompletionModal
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

  // Handle reopen action
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
      const response = await fetch(`/api/shakedowns/${shakedown.id}/archive`, {
        method: 'POST',
      });
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
      const response = await fetch(`/api/shakedowns/${shakedown.id}`, {
        method: 'DELETE',
      });
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
    return <ErrorState type={error.type} onRetry={refresh} />;
  }

  // Not loaded / not found
  if (!shakedown) {
    return <ErrorState type="not_found" />;
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

              {/* Start Similar Shakedown - for authenticated non-owners */}
              {user && !isOwner && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // Calculate trip duration in days
                        const startDate = new Date(shakedown.tripStartDate);
                        const endDate = new Date(shakedown.tripEndDate);
                        const durationDays = Math.ceil(
                          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                        );

                        // Build URL with prefilled params
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
                  <TooltipContent side="bottom">
                    {tActions('startSimilarTooltip')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Trip Context */}
      <TripContext
        experienceLevel={shakedown.experienceLevel}
        concerns={shakedown.concerns}
      />

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
      <FeedbackSection
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

      {/* Completion Modal - allows owner to mark feedback as helpful before completing */}
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

// =============================================================================
// Exports
// =============================================================================

export default ShakedownDetail;
