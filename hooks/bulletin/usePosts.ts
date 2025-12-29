'use client';

/**
 * Post CRUD Operations Hook
 *
 * Feature: 051-community-bulletin-board
 * Task: T024
 *
 * Handles post creation, update, and deletion with optimistic updates.
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  createBulletinPost,
  updateBulletinPost,
  deleteBulletinPost,
  canEditBulletinPost,
} from '@/lib/supabase/bulletin-queries';
import type {
  BulletinPost,
  BulletinPostWithAuthor,
  CreatePostInput,
  UpdatePostInput,
  PostError,
} from '@/types/bulletin';

type PostOperationState = 'idle' | 'loading' | 'success' | 'error';

interface UsePostsReturn {
  // State
  operationState: PostOperationState;
  error: PostError | Error | null;

  // CRUD Operations
  createPost: (
    input: CreatePostInput,
    authorInfo: { name: string; avatar: string | null }
  ) => Promise<BulletinPostWithAuthor | null>;
  updatePost: (postId: string, input: UpdatePostInput) => Promise<BulletinPost | null>;
  deletePost: (postId: string) => Promise<boolean>;
  checkCanEdit: (postId: string) => Promise<boolean>;

  // State management
  resetState: () => void;
}

export function usePosts(): UsePostsReturn {
  const supabase = createClient();

  const [operationState, setOperationState] =
    useState<PostOperationState>('idle');
  const [error, setError] = useState<PostError | Error | null>(null);

  /**
   * Reset operation state
   */
  const resetState = useCallback(() => {
    setOperationState('idle');
    setError(null);
  }, []);

  /**
   * Create a new post
   * Returns the full post with author info for optimistic UI updates
   */
  const createPost = useCallback(
    async (
      input: CreatePostInput,
      authorInfo: { name: string; avatar: string | null }
    ): Promise<BulletinPostWithAuthor | null> => {
      setOperationState('loading');
      setError(null);

      try {
        const post = await createBulletinPost(supabase, input);

        // Construct full post with author for UI
        const postWithAuthor: BulletinPostWithAuthor = {
          ...post,
          author_name: authorInfo.name,
          author_avatar: authorInfo.avatar,
        };

        setOperationState('success');
        return postWithAuthor;
      } catch (err) {
        setError(err as PostError | Error);
        setOperationState('error');
        return null;
      }
    },
    [supabase]
  );

  /**
   * Update an existing post
   */
  const updatePost = useCallback(
    async (
      postId: string,
      input: UpdatePostInput
    ): Promise<BulletinPost | null> => {
      setOperationState('loading');
      setError(null);

      try {
        const post = await updateBulletinPost(supabase, postId, input);
        setOperationState('success');
        return post;
      } catch (err) {
        setError(err as Error);
        setOperationState('error');
        return null;
      }
    },
    [supabase]
  );

  /**
   * Soft delete a post
   */
  const deletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      setOperationState('loading');
      setError(null);

      try {
        await deleteBulletinPost(supabase, postId);
        setOperationState('success');
        return true;
      } catch (err) {
        setError(err as Error);
        setOperationState('error');
        return false;
      }
    },
    [supabase]
  );

  /**
   * Check if user can edit a post (within 15-min window)
   */
  const checkCanEdit = useCallback(
    async (postId: string): Promise<boolean> => {
      try {
        return await canEditBulletinPost(supabase, postId);
      } catch {
        return false;
      }
    },
    [supabase]
  );

  return {
    operationState,
    error,
    createPost,
    updatePost,
    deletePost,
    checkCanEdit,
    resetState,
  };
}

/**
 * Type guard to check if error is a PostError (rate limit, duplicate, or banned)
 */
export function isPostError(error: unknown): error is PostError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error.type === 'rate_limit' ||
      error.type === 'duplicate' ||
      error.type === 'banned')
  );
}
