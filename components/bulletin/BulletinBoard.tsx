'use client';

/**
 * Bulletin Board Container Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T030
 *
 * Main board container with header, "New Post" button,
 * tag filter, search, and post list with infinite scroll.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useBulletinBoard, usePosts, isPostError } from '@/hooks/bulletin';
import { BULLETIN_CONSTANTS } from '@/types/bulletin';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { PostSkeleton } from './PostSkeleton';
import { TagFilter } from './TagFilter';
import { SearchBar } from './SearchBar';
import { EmptyState } from './EmptyState';
import { ReplyThread } from './ReplyThread';
import { ReportModal } from './ReportModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import type { CreatePostSchema } from '@/lib/validations/bulletin';
import type { BulletinPostWithAuthor } from '@/types/bulletin';

interface BulletinBoardProps {
  initialPosts?: BulletinPostWithAuthor[];
}

export function BulletinBoard({ initialPosts }: BulletinBoardProps) {
  const t = useTranslations('bulletin');
  const supabase = createClient();

  // Board state
  const {
    posts,
    hasMore,
    loadingState,
    error,
    activeTag,
    searchQuery,
    loadMore,
    setActiveTag,
    setSearchQuery,
    clearFilters,
    addPostOptimistically,
    removePost,
    updatePost,
  } = useBulletinBoard();

  // Check if we have active filters (for showing no-results vs empty state)
  const hasActiveFilters = activeTag !== null || searchQuery.length > 0;

  // Post operations
  const { createPost, deletePost, operationState } = usePosts();

  // UI state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    type: 'post' | 'reply';
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'post' | 'reply';
    hasReplies: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    avatar: string | null;
  } | null>(null);

  // Infinite scroll ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        setCurrentUser({
          id: user.id,
          name: profile?.display_name ?? t('common.defaultUser'),
          avatar: profile?.avatar_url ?? null,
        });
      }
    };
    getUser();
  }, [supabase, t]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && loadingState === 'idle') {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingState, loadMore]);

  // Handle post creation with specific error handling (T073, T074)
  const handleCreatePost = useCallback(
    async (data: CreatePostSchema) => {
      if (!currentUser) return;

      try {
        const post = await createPost(data, {
          name: currentUser.name,
          avatar: currentUser.avatar,
        });

        if (post) {
          addPostOptimistically(post);
          toast.success(t('success.postCreated'));
        }
      } catch (error) {
        // Handle specific error types with appropriate UI feedback
        if (isPostError(error)) {
          switch (error.type) {
            case 'rate_limit':
              toast.error(
                t('errors.rateLimitPosts', {
                  limit: BULLETIN_CONSTANTS.DAILY_POST_LIMIT,
                })
              );
              break;
            case 'duplicate':
              toast.error(t('errors.duplicatePost'));
              break;
            case 'banned':
              toast.error(t('errors.banned'));
              break;
          }
        } else {
          toast.error(t('errors.createFailed'));
        }
      }
    },
    [createPost, currentUser, addPostOptimistically, t]
  );

  // Handle post deletion request (shows confirmation)
  const handleDeleteRequest = useCallback(
    (postId: string) => {
      const post = displayPosts.find((p) => p.id === postId);
      setDeleteTarget({
        id: postId,
        type: 'post',
        hasReplies: (post?.reply_count ?? 0) > 0,
      });
    },
    [displayPosts]
  );

  // Handle confirmed deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const success = await deletePost(deleteTarget.id);
      if (success) {
        removePost(deleteTarget.id);
        toast.success(t('success.postDeleted'));
        setDeleteTarget(null);
      } else {
        toast.error(t('errors.deleteFailed'));
      }
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deletePost, removePost, t]);

  // Handle reply toggle
  const handleToggleReplies = useCallback((postId: string) => {
    setExpandedPostId((prev) => (prev === postId ? null : postId));
  }, []);

  // Handle search with debounce
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  // Display posts (use initial if available and no local state yet)
  const displayPosts = posts.length > 0 ? posts : initialPosts ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsComposerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newPost')}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} />
        <TagFilter activeTag={activeTag} onTagChange={setActiveTag} />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Loading state with skeleton */}
      {loadingState === 'loading' && displayPosts.length === 0 && (
        <PostSkeleton count={3} />
      )}

      {/* Empty state or no results */}
      {loadingState === 'idle' && displayPosts.length === 0 && !error && (
        hasActiveFilters ? (
          <EmptyState
            variant="no-results"
            onClearFilters={clearFilters}
          />
        ) : (
          <EmptyState
            variant="empty"
            onCreatePost={() => setIsComposerOpen(true)}
          />
        )
      )}

      {/* Post list */}
      {displayPosts.length > 0 && (
        <div className="space-y-4">
          {displayPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUser?.id}
              onEdit={(id) => {
                // TODO: Implement edit modal
                console.log('Edit post:', id);
              }}
              onDelete={handleDeleteRequest}
              onReport={(id) => setReportTarget({ id, type: 'post' })}
              onToggleReplies={handleToggleReplies}
              isExpanded={expandedPostId === post.id}
            >
              {expandedPostId === post.id && (
                <ReplyThread
                  postId={post.id}
                  currentUser={currentUser}
                  onReplyCountChange={(delta) => {
                    updatePost(post.id, {
                      reply_count: post.reply_count + delta,
                    });
                  }}
                  onReportReply={(replyId) =>
                    setReportTarget({ id: replyId, type: 'reply' })
                  }
                />
              )}
            </PostCard>
          ))}
        </div>
      )}

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loadingState === 'loading-more' && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                {t('loadingMore')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Post composer modal */}
      <PostComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={operationState === 'loading'}
      />

      {/* Report modal */}
      <ReportModal
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type ?? 'post'}
        targetId={reportTarget?.id ?? ''}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        type={deleteTarget?.type ?? 'post'}
        hasReplies={deleteTarget?.hasReplies ?? false}
        isDeleting={isDeleting}
      />
    </div>
  );
}
