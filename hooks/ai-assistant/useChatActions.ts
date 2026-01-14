/**
 * useChatActions Hook
 * Feature 050: AI Assistant - T053, T061
 * Issue #60: Action execution results persistence
 *
 * Handles execution of AI-suggested actions (Add to Wishlist, Compare, Send Message, Navigate)
 * Provides action execution functions with optimistic updates and error handling.
 * T061: Implements action status tracking with pending → completed/failed transitions.
 * Issue #60: Persists action results to database to prevent data loss on reload.
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Action } from '@/types/ai-assistant';
import {
  executeAddToWishlist,
  executeCompareGear,
  executeSendMessage,
  executeNavigate,
  updateActionResult,
} from '@/app/[locale]/ai-assistant/actions';

interface UseChatActionsResult {
  executeAction: (action: Action, messageId?: string) => Promise<void>;
  isExecuting: boolean;
  actionStatuses: Map<string, 'pending' | 'completed' | 'failed'>;
  loadActionResults: (messages: Array<{ id: string; action_results?: unknown }>) => void;
}

export function useChatActions(): UseChatActionsResult {
  const [isExecuting, setIsExecuting] = useState(false);
  // T061: Track action statuses for optimistic UI updates
  const [actionStatuses, setActionStatuses] = useState<Map<string, 'pending' | 'completed' | 'failed'>>(
    new Map()
  );
  const router = useRouter();
  const t = useTranslations('aiAssistant.actions');

  // Issue #60: Load action results from database when messages are loaded
  const loadActionResults = useCallback((messages: Array<{ id: string; action_results?: unknown }>) => {
    const newStatuses = new Map<string, 'pending' | 'completed' | 'failed'>();

    messages.forEach((message) => {
      if (message.action_results) {
        const results = message.action_results as Record<string, { status: 'completed' | 'failed' }>;
        Object.entries(results).forEach(([actionId, result]) => {
          newStatuses.set(actionId, result.status);
        });
      }
    });

    setActionStatuses(newStatuses);
  }, []);

  const executeAction = useCallback(
    async (action: Action, messageId?: string) => {
      // T069: Check for destructive actions (would need UI confirmation)
      // For now, all actions are considered safe - destructive actions would be
      // implemented with a separate confirmation dialog in the UI layer

      // T061: Generate action ID for status tracking
      const actionId = messageId ? `${messageId}-${action.type}` : `${action.type}-${Date.now()}`;

      // T061: Set initial status to pending (optimistic update)
      setActionStatuses((prev) => new Map(prev).set(actionId, 'pending'));
      setIsExecuting(true);

      try {
        let actionResult: Record<string, unknown> = {};

        switch (action.type) {
          case 'add_to_wishlist':
            actionResult = await handleAddToWishlist(action, t);
            break;

          case 'compare':
            actionResult = await handleCompareGear(action, t, router);
            break;

          case 'send_message':
            actionResult = await handleSendMessage(action, t);
            break;

          case 'navigate':
            actionResult = await handleNavigate(action, t, router);
            break;
        }

        // T061: Mark as completed on success
        setActionStatuses((prev) => new Map(prev).set(actionId, 'completed'));

        // Issue #60: Persist success result to database
        if (messageId) {
          await updateActionResult(messageId, actionId, 'completed', actionResult);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Action failed';

        // T061: Mark as failed with error (rollback)
        setActionStatuses((prev) => new Map(prev).set(actionId, 'failed'));

        // Issue #60: Persist failure result to database
        if (messageId) {
          await updateActionResult(messageId, actionId, 'failed', undefined, errorMessage);
        }

        toast.error(errorMessage);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [router, t]
  );

  return {
    executeAction,
    isExecuting,
    actionStatuses,
    loadActionResults,
  };
}

// Action handlers (T064: Inline confirmations, T065: Inline errors)

 
async function handleAddToWishlist(action: Action, t: (key: string, values?: Record<string, unknown>) => string): Promise<Record<string, unknown>> {
  if (action.type !== 'add_to_wishlist') return {};

  const result = await executeAddToWishlist(action.gearItemId);

  if (!result.success) {
    throw new Error(t('errors.addToWishlistFailed', { error: result.error }));
  }

  // T064: Confirmation toast
  toast.success(t('confirmations.addedToWishlist', { itemName: 'Item' }));

  // Issue #60: Return result data for persistence
  return { gearItemId: action.gearItemId };
}

async function handleCompareGear(action: Action, t: (key: string, values?: Record<string, unknown>) => string, router: ReturnType<typeof useRouter>): Promise<Record<string, unknown>> {
  if (action.type !== 'compare') return {};

  const result = await executeCompareGear(action.gearItemIds);

  if (!result.success) {
    throw new Error(t('errors.compareFailed', { error: result.error }));
  }

  // T066: Navigate to comparison page
  if (result.compareUrl) {
    toast.success(t('confirmations.comparisonReady'));
    router.push(result.compareUrl);
  }

  // Issue #60: Return result data for persistence
  return { gearItemIds: action.gearItemIds, compareUrl: result.compareUrl };
}

async function handleSendMessage(action: Action, t: (key: string, values?: Record<string, unknown>) => string): Promise<Record<string, unknown>> {
  if (action.type !== 'send_message') return {};

  const result = await executeSendMessage(action.recipientUserId, action.messagePreview);

  if (!result.success) {
    throw new Error(t('errors.messageFailed', { error: result.error }));
  }

  // T064: Confirmation toast
  toast.success(t('confirmations.messageSent', { recipientName: 'User' }));

  // Issue #60: Return result data for persistence
  return { recipientUserId: action.recipientUserId, conversationId: result.conversationId };
}

async function handleNavigate(action: Action, t: (key: string, values?: Record<string, unknown>) => string, router: ReturnType<typeof useRouter>): Promise<Record<string, unknown>> {
  if (action.type !== 'navigate') return {};

  const result = await executeNavigate(action.destination);

  if (!result.success) {
    throw new Error(t('errors.navigationFailed', { error: result.error }));
  }

  // Execute navigation
  if (result.path) {
    toast.success(t('confirmations.navigating', { destination: action.destination }));
    router.push(result.path);
  }

  // Issue #60: Return result data for persistence
  return { destination: action.destination, path: result.path };
}
