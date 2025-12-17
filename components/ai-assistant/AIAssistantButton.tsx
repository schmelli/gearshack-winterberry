/**
 * AI Assistant Button Component
 * Feature 050: AI Assistant - T023
 *
 * Icon button in the title bar that opens AI assistant.
 * Shows Trailblazer badge overlay for premium feature indication.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAssistantButtonProps {
  onClick: () => void;
  isTrailblazer: boolean;
  className?: string;
}

export function AIAssistantButton({
  onClick,
  isTrailblazer,
  className,
}: AIAssistantButtonProps) {
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'relative transition-colors hover:bg-accent',
          className
        )}
        aria-label="AI Assistant"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      {/* Trailblazer Badge Overlay */}
      {isTrailblazer && (
        <div
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[8px] font-bold text-white shadow-sm"
          aria-label="Trailblazer feature"
        >
          T
        </div>
      )}
    </div>
  );
}
