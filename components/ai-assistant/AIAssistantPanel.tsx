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
        'flex flex-col border-l border-border bg-background',
        'h-[calc(100vh-6rem)]',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label={t('panel.close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface onClose={close} />
      </div>
    </aside>
  );
}
