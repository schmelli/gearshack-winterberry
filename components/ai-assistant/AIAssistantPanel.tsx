'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
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
        'h-[calc(100vh-6rem)]',
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

      {/* Chat Interface (has its own header with title, voice, new chat) */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface onClose={close} />
      </div>
    </aside>
  );
}
