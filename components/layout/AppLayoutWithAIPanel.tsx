'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';
import { AIAssistantPanel } from '@/components/ai-assistant/AIAssistantPanel';
import { ResizableDragHandle } from '@/components/ui/ResizableDragHandle';
import { cn } from '@/lib/utils';

interface AppLayoutWithAIPanelProps {
  children: React.ReactNode;
}

export function AppLayoutWithAIPanel({ children }: AppLayoutWithAIPanelProps) {
  const { isOpen, panelWidth, setWidth } = useAIPanelStore();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Mobile: bottom sheet handled in a later task
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto">{children}</div>
        {/* Mobile bottom sheet added in Task 6-7 */}
      </div>
    );
  }

  // Desktop: Side panel layout
  return (
    <div className="flex h-full">
      <div
        className={cn(
          'flex-1 overflow-auto transition-all duration-200',
          isOpen && 'mr-1'
        )}
      >
        {children}
      </div>

      {isOpen && (
        <>
          <ResizableDragHandle
            onResize={setWidth}
            minWidth={300}
            maxWidth={600}
          />
          <AIAssistantPanel />
        </>
      )}
    </div>
  );
}
