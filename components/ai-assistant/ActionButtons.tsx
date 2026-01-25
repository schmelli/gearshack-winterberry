/**
 * ActionButtons Component
 * Feature 050: AI Assistant - T052
 *
 * Renders action buttons for AI responses (Add to Wishlist, Compare, Send Message)
 * Stateless component - onClick handlers provided via props
 */

'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Plus, Scale, MessageCircle, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Action } from '@/types/ai-assistant';

interface ActionButtonsProps {
  actions: Action[];
  onActionClick: (action: Action) => void;
  disabled?: boolean;
}

export function ActionButtons({ actions, onActionClick, disabled = false }: ActionButtonsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action, index) => (
        <ActionButton
          key={`${action.type}-${index}`}
          action={action}
          onClick={() => onActionClick(action)}
          disabled={disabled || action.status === 'pending' || action.status === 'completed'}
        />
      ))}
    </div>
  );
}

interface ActionButtonProps {
  action: Action;
  onClick: () => void;
  disabled: boolean;
}

function ActionButton({ action, onClick, disabled }: ActionButtonProps) {
  const t = useTranslations('AIAssistant');

  const getButtonConfig = () => {
    switch (action.type) {
      case 'add_to_wishlist':
        return {
          icon: Plus,
          label: t('actions.addToWishlist'),
          variant: 'default' as const,
        };
      case 'compare':
        return {
          icon: Scale,
          label: t('actions.compare'),
          variant: 'outline' as const,
        };
      case 'send_message':
        return {
          icon: MessageCircle,
          label: t('actions.sendMessage'),
          variant: 'outline' as const,
        };
      case 'navigate':
        return {
          icon: ExternalLink,
          label: t('actions.viewDetails'),
          variant: 'outline' as const,
        };
    }
  };

  const config = getButtonConfig();
  const Icon = config.icon;

  // Show status indicators
  const isPending = action.status === 'pending';
  const isCompleted = action.status === 'completed';
  const isFailed = action.status === 'failed';

  return (
    <Button
      size="sm"
      variant={config.variant}
      onClick={onClick}
      disabled={disabled}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isCompleted ? (
        <span className="text-green-600">✓</span>
      ) : isFailed ? (
        <span className="text-red-600">✗</span>
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {config.label}
    </Button>
  );
}
