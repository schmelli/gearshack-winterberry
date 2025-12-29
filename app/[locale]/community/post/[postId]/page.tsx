/**
 * Direct Post Link Page
 *
 * Feature: 051-community-bulletin-board
 * Task: T072
 *
 * Shows a single post with its replies.
 * Ignores archive status to allow direct linking to older posts.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { PostDetailView } from './PostDetailView';
import { PostSkeleton } from '@/components/bulletin/PostSkeleton';

interface PostPageProps {
  params: Promise<{
    locale: string;
    postId: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(postId)) {
    notFound();
  }

  return (
    <div className="container max-w-2xl py-8">
      <Suspense fallback={<PostSkeleton count={1} />}>
        <PostDetailContent postId={postId} />
      </Suspense>
    </div>
  );
}

async function PostDetailContent({ postId }: { postId: string }) {
  const supabase = await createClient();
  const t = await getTranslations('bulletin');

  // Fetch post with author info (ignoring is_archived)
  // Using 'as any' because bulletin_posts table not in generated types yet (migration pending)
  const { data: post, error } = await (supabase.from as any)('bulletin_posts')
    .select(
      `
      *,
      author:profiles!bulletin_posts_author_id_fkey (
        display_name,
        avatar_url
      )
    `
    )
    .eq('id', postId)
    .single();

  if (error || !post) {
    notFound();
  }

  // Transform to match BulletinPostWithAuthor type
  const postWithAuthor = {
    ...post,
    author_name: post.author?.display_name ?? t('common.unknown'),
    author_avatar: post.author?.avatar_url ?? null,
  };

  return <PostDetailView post={postWithAuthor} />;
}
