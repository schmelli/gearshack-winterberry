'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { AIPanelErrorBoundary } from './AIPanelErrorBoundary';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface AIAssistantPanelProps {
  className?: string;
}

export function AIAssistantPanel({ className }: AIAssistantPanelProps) {
  const t = useTranslations('AIAssistant');
  const { close, panelWidth } = useAIPanelStore();

  return (
    <aside
      data-ai-panel
      style={{ width: `${panelWidth}px` }}
      className={cn(
        'relative flex flex-col border-l border-border bg-background',
        'h-[calc(100dvh-6rem)]',
        className
      )}
    >
      {/* Close button overlaid on ChatInterface header */}
      <Button
        variant="ghost"
        size="icon"
        onClick={close}
        aria-label={t('panel.close')}
        className="absolute right-2 top-3 z-10"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Chat Interface with error boundary */}
      <div className="flex-1 overflow-hidden">
        <AIPanelErrorBoundary
          fallbackTitle={t('panel.errorTitle')}
          fallbackRetry={t('panel.retry')}
        >
          <ChatInterface onClose={close} />
        </AIPanelErrorBoundary>
      </div>
    </aside>
  );
}
