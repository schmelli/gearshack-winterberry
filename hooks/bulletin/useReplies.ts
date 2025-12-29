'use client';

/**
 * Reply CRUD and Tree Construction Hook
 *
 * Feature: 051-community-bulletin-board
 * Task: T025
 *
 * Handles reply operations and builds nested reply trees (max 2 levels).
 */

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchBulletinReplies,
  createBulletinReply,
  updateBulletinReply,
  deleteBulletinReply,
} from '@/lib/supabase/bulletin-queries';
import type {
  BulletinReply,
  BulletinReplyWithAuthor,
  CreateReplyInput,
  ReplyNode,
  PostError,
} from '@/types/bulletin';

type ReplyOperationState = 'idle' | 'loading' | 'success' | 'error';

interface UseRepliesReturn {
  // State
  replies: BulletinReplyWithAuthor[];
  replyTree: ReplyNode[];
  isLoading: boolean;
  operationState: ReplyOperationState;
  error: PostError | Error | null;

  // Actions
  loadReplies: (postId: string) => Promise<void>;
  createReply: (
    input: CreateReplyInput,
    authorInfo: { name: string; avatar: string | null }
  ) => Promise<BulletinReplyWithAuthor | null>;
  updateReply: (replyId: string, content: string) => Promise<BulletinReply | null>;
  deleteReply: (replyId: string) => Promise<boolean>;
  resetState: () => void;

  // Optimistic updates
  addReplyOptimistically: (reply: BulletinReplyWithAuthor) => void;
  removeReply: (replyId: string) => void;
}

export function useReplies(): UseRepliesReturn {
  const supabase = createClient();

  const [replies, setReplies] = useState<BulletinReplyWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [operationState, setOperationState] =
    useState<ReplyOperationState>('idle');
  const [error, setError] = useState<PostError | Error | null>(null);

  /**
   * Build a nested tree structure from flat replies
   * Max 2 levels of nesting
   */
  const replyTree = useMemo((): ReplyNode[] => {
    return buildReplyTree(replies);
  }, [replies]);

  /**
   * Load all replies for a post
   */
  const loadReplies = useCallback(
    async (postId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBulletinReplies(supabase, postId);
        setReplies(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Create a new reply
   */
  const createReply = useCallback(
    async (
      input: CreateReplyInput,
      authorInfo: { name: string; avatar: string | null }
    ): Promise<BulletinReplyWithAuthor | null> => {
      setOperationState('loading');
      setError(null);

      try {
        const reply = await createBulletinReply(supabase, input);

        // Construct full reply with author for UI
        const replyWithAuthor: BulletinReplyWithAuthor = {
          ...reply,
          author_name: authorInfo.name,
          author_avatar: authorInfo.avatar,
        };

        // Add to local state
        setReplies((prev) => [...prev, replyWithAuthor]);
        setOperationState('success');
        return replyWithAuthor;
      } catch (err) {
        setError(err as PostError | Error);
        setOperationState('error');
        return null;
      }
    },
    [supabase]
  );

  /**
   * Update a reply's content
   */
  const updateReply = useCallback(
    async (
      replyId: string,
      content: string
    ): Promise<BulletinReply | null> => {
      setOperationState('loading');
      setError(null);

      try {
        const reply = await updateBulletinReply(supabase, replyId, content);

        // Update local state
        setReplies((prev) =>
          prev.map((r) =>
            r.id === replyId
              ? { ...r, content, updated_at: new Date().toISOString() }
              : r
          )
        );

        setOperationState('success');
        return reply;
      } catch (err) {
        setError(err as Error);
        setOperationState('error');
        return null;
      }
    },
    [supabase]
  );

  /**
   * Soft delete a reply
   */
  const deleteReply = useCallback(
    async (replyId: string): Promise<boolean> => {
      setOperationState('loading');
      setError(null);

      try {
        await deleteBulletinReply(supabase, replyId);

        // Mark as deleted in local state (soft delete)
        setReplies((prev) =>
          prev.map((r) => (r.id === replyId ? { ...r, is_deleted: true } : r))
        );

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
   * Add reply optimistically (for immediate UI feedback)
   */
  const addReplyOptimistically = useCallback(
    (reply: BulletinReplyWithAuthor) => {
      setReplies((prev) => [...prev, reply]);
    },
    []
  );

  /**
   * Remove a reply from local state
   */
  const removeReply = useCallback((replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  }, []);

  /**
   * Reset operation state
   */
  const resetState = useCallback(() => {
    setOperationState('idle');
    setError(null);
  }, []);

  return {
    replies,
    replyTree,
    isLoading,
    operationState,
    error,
    loadReplies,
    createReply,
    updateReply,
    deleteReply,
    resetState,
    addReplyOptimistically,
    removeReply,
  };
}

/**
 * Build a nested tree structure from flat replies
 * Replies are sorted by created_at, with children nested under parents
 */
function buildReplyTree(replies: BulletinReplyWithAuthor[]): ReplyNode[] {
  const nodeMap = new Map<string, ReplyNode>();
  const rootNodes: ReplyNode[] = [];

  // First pass: create nodes
  for (const reply of replies) {
    nodeMap.set(reply.id, { ...reply, children: [] });
  }

  // Second pass: build tree
  for (const reply of replies) {
    const node = nodeMap.get(reply.id)!;

    if (reply.parent_reply_id && nodeMap.has(reply.parent_reply_id)) {
      // This is a child reply - add to parent's children
      const parent = nodeMap.get(reply.parent_reply_id)!;
      parent.children.push(node);
    } else {
      // This is a root reply (depth 1)
      rootNodes.push(node);
    }
  }

  // Sort children by created_at
  for (const node of nodeMap.values()) {
    node.children.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  // Sort root nodes by created_at
  rootNodes.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return rootNodes;
}
