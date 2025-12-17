/**
 * useChatActions Hook
 * Feature 050: AI Assistant - T053, T061
 *
 * Handles execution of AI-suggested actions (Add to Wishlist, Compare, Send Message, Navigate)
 * Provides action execution functions with optimistic updates and error handling.
 * T061: Implements action status tracking with pending → completed/failed transitions.
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
} from '@/app/[locale]/ai-assistant/actions';

interface UseChatActionsResult {
  executeAction: (action: Action, messageId?: string) => Promise<void>;
  isExecuting: boolean;
  actionStatuses: Map<string, 'pending' | 'completed' | 'failed'>;
}

export function useChatActions(): UseChatActionsResult {
  const [isExecuting, setIsExecuting] = useState(false);
  // T061: Track action statuses for optimistic UI updates
  const [actionStatuses, setActionStatuses] = useState<Map<string, 'pending' | 'completed' | 'failed'>>(
    new Map()
  );
  const router = useRouter();
  const t = useTranslations('aiAssistant.actions');

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
        switch (action.type) {
          case 'add_to_wishlist':
            await handleAddToWishlist(action, t);
            break;

          case 'compare':
            await handleCompareGear(action, t, router);
            break;

          case 'send_message':
            await handleSendMessage(action, t);
            break;

          case 'navigate':
            await handleNavigate(action, t, router);
            break;
        }

        // T061: Mark as completed on success
        setActionStatuses((prev) => new Map(prev).set(actionId, 'completed'));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Action failed';

        // T061: Mark as failed with error (rollback)
        setActionStatuses((prev) => new Map(prev).set(actionId, 'failed'));

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
  };
}

// Action handlers (T064: Inline confirmations, T065: Inline errors)

async function handleAddToWishlist(action: Action, t: any) {
  if (action.type !== 'add_to_wishlist') return;

  const result = await executeAddToWishlist(action.gearItemId);

  if (!result.success) {
    throw new Error(t('errors.addToWishlistFailed', { error: result.error }));
  }

  // T064: Confirmation toast
  toast.success(t('confirmations.addedToWishlist', { itemName: 'Item' }));
}

async function handleCompareGear(action: Action, t: any, router: ReturnType<typeof useRouter>) {
  if (action.type !== 'compare') return;

  const result = await executeCompareGear(action.gearItemIds);

  if (!result.success) {
    throw new Error(t('errors.compareFailed', { error: result.error }));
  }

  // T066: Navigate to comparison page
  if (result.compareUrl) {
    toast.success(t('confirmations.comparisonReady'));
    router.push(result.compareUrl);
  }
}

async function handleSendMessage(action: Action, t: any) {
  if (action.type !== 'send_message') return;

  const result = await executeSendMessage(action.recipientUserId, action.messagePreview);

  if (!result.success) {
    throw new Error(t('errors.messageFailed', { error: result.error }));
  }

  // T064: Confirmation toast
  toast.success(t('confirmations.messageSent', { recipientName: 'User' }));
}

async function handleNavigate(action: Action, t: any, router: ReturnType<typeof useRouter>) {
  if (action.type !== 'navigate') return;

  const result = await executeNavigate(action.destination);

  if (!result.success) {
    throw new Error(t('errors.navigationFailed', { error: result.error }));
  }

  // Execute navigation
  if (result.path) {
    toast.success(t('confirmations.navigating', { destination: action.destination }));
    router.push(result.path);
  }
}
