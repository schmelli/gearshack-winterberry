'use client';

/**
 * Post Detail View Component
 *
 * Feature: 051-community-bulletin-board
 * Task: T072
 *
 * Client component for displaying a single post with interactive features.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { usePosts } from '@/hooks/bulletin';
import { PostCard } from '@/components/bulletin/PostCard';
import { ReplyThread } from '@/components/bulletin/ReplyThread';
import { ReportModal } from '@/components/bulletin/ReportModal';
import { DeleteConfirmDialog } from '@/components/bulletin/DeleteConfirmDialog';
import type { BulletinPostWithAuthor } from '@/types/bulletin';

interface PostDetailViewProps {
  post: BulletinPostWithAuthor;
}

export function PostDetailView({ post: initialPost }: PostDetailViewProps) {
  const t = useTranslations('bulletin');
  const router = useRouter();
  const supabase = createClient();
  const { deletePost } = usePosts();

  const [post, setPost] = useState(initialPost);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    avatar: string | null;
  } | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    type: 'post' | 'reply';
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          name: profile?.display_name ?? 'User',
          avatar: profile?.avatar_url ?? null,
        });
      }
    };
    getUser();
  }, [supabase]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const success = await deletePost(post.id);
      if (success) {
        toast.success(t('success.postDeleted'));
        router.push('/community');
      } else {
        toast.error(t('errors.deleteFailed'));
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [deletePost, post.id, router, t]);

  const handleReplyCountChange = useCallback((delta: number) => {
    setPost((prev) => ({
      ...prev,
      reply_count: prev.reply_count + delta,
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/community')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('title')}
      </Button>

      {/* Post card - always expanded */}
      <PostCard
        post={post}
        currentUserId={currentUser?.id}
        onEdit={() => {
          // TODO: Implement edit
        }}
        onDelete={() => setShowDeleteConfirm(true)}
        onReport={(id) => setReportTarget({ id, type: 'post' })}
        onToggleReplies={() => {}}
        isExpanded={true}
      >
        <ReplyThread
          postId={post.id}
          currentUser={currentUser}
          onReplyCountChange={handleReplyCountChange}
          onReportReply={(replyId) =>
            setReportTarget({ id: replyId, type: 'reply' })
          }
        />
      </PostCard>

      {/* Report modal */}
      <ReportModal
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type ?? 'post'}
        targetId={reportTarget?.id ?? ''}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        type="post"
        hasReplies={post.reply_count > 0}
        isDeleting={isDeleting}
      />
    </div>
  );
}
