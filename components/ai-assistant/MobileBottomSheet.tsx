'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { AIPanelErrorBoundary } from './AIPanelErrorBoundary';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SNAP_POINTS = {
  peek: 0.5,
  normal: 0.85,
  full: 1.0,
};

const CLOSE_THRESHOLD = 0.3;
const VELOCITY_THRESHOLD = 0.5;

export function MobileBottomSheet() {
  const t = useTranslations('AIAssistant');
  const { close } = useAIPanelStore();
  const [mounted, setMounted] = useState(false);
  const [snapPoint, setSnapPoint] = useState(SNAP_POINTS.normal);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const touchStartRef = useRef({ y: 0, time: 0 });
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync portal mount state
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(close, 300);
  }, [close]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Only allow dragging from the drag handle area
    if (!target.closest('[data-drag-handle]')) return;

    touchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;

      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      // Only allow dragging downward (positive deltaY)
      setDragOffset(Math.max(0, deltaY));
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const velocity =
      dragOffset / (Date.now() - touchStartRef.current.time) * 1000;

    // Close if dragged far enough or fast enough
    if (
      dragOffset > window.innerHeight * CLOSE_THRESHOLD ||
      velocity > VELOCITY_THRESHOLD * 1000
    ) {
      handleClose();
    } else {
      // Snap to nearest point
      const sheetHeight = window.innerHeight * snapPoint;
      const currentHeight = sheetHeight - dragOffset;
      const ratio = currentHeight / window.innerHeight;

      const newSnap =
        ratio > 0.9
          ? SNAP_POINTS.full
          : ratio > 0.65
            ? SNAP_POINTS.normal
            : SNAP_POINTS.peek;

      setSnapPoint(newSnap);
    }

    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, snapPoint, handleClose]);

  if (!mounted) return null;

  const sheetHeight = window.innerHeight * snapPoint;
  const translateY = isClosing ? window.innerHeight : dragOffset;

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300',
          isClosing && 'opacity-0'
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          height: `${sheetHeight}px`,
          transform: `translateY(${translateY}px)`,
          touchAction: 'none',
        }}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-2xl bg-background shadow-xl',
          !isDragging && 'transition-transform duration-300 ease-out'
        )}
      >
        {/* Drag Handle */}
        <div data-drag-handle className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close button overlaid on ChatInterface header */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label={t('panel.close')}
          className="absolute right-2 top-14 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Chat Interface with error boundary */}
        <div className="flex-1 overflow-hidden">
          <AIPanelErrorBoundary
            fallbackTitle={t('panel.errorTitle')}
            fallbackRetry={t('panel.retry')}
          >
            <ChatInterface onClose={handleClose} />
          </AIPanelErrorBoundary>
        </div>
      </div>
    </>
  );

  return createPortal(sheet, document.body);
}
