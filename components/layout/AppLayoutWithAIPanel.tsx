'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';
import { AIAssistantPanel } from '@/components/ai-assistant/AIAssistantPanel';
import { MobileBottomSheet } from '@/components/ai-assistant/MobileBottomSheet';
import { ResizableDragHandle } from '@/components/ui/ResizableDragHandle';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useSubscriptionCheck } from '@/hooks/ai-assistant/useSubscriptionCheck';
import { cn } from '@/lib/utils';

interface AppLayoutWithAIPanelProps {
  children: React.ReactNode;
}

export function AppLayoutWithAIPanel({ children }: AppLayoutWithAIPanelProps) {
  const { isOpen, setWidth } = useAIPanelStore();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { user } = useAuthContext();
  const { isTrailblazer, isLoading } = useSubscriptionCheck(user?.uid || null);

  // Only show panel for Trailblazer subscribers
  const showPanel = isOpen && isTrailblazer && !isLoading;

  // Mobile: bottom sheet via portal
  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-auto">{children}</div>
        {showPanel && <MobileBottomSheet />}
      </div>
    );
  }

  // Desktop: Side panel layout
  return (
    <div className="flex flex-1">
      <div
        className={cn(
          'flex-1 overflow-auto transition-all duration-200',
          showPanel && 'mr-1'
        )}
      >
        {children}
      </div>

      {showPanel && (
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
