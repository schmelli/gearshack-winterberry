'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizableDragHandleProps {
  onResize: (width: number) => void;
  minWidth: number;
  maxWidth: number;
}

export function ResizableDragHandle({
  onResize,
  minWidth,
  maxWidth,
}: ResizableDragHandleProps) {
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const panelElementRef = useRef<HTMLElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    e.preventDefault();
  }, []);

  useEffect(() => {
    // Cache panel element on mount
    panelElementRef.current = document.querySelector('[data-ai-panel]') as HTMLElement;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = lastXRef.current - e.clientX;
      lastXRef.current = e.clientX;

      const panelElement = panelElementRef.current;
      if (!panelElement) return;

      const currentWidth = panelElement.offsetWidth;
      const newWidth = currentWidth + deltaX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      onResize(clampedWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize, minWidth, maxWidth]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'group relative w-1 cursor-col-resize bg-transparent hover:bg-primary/20',
        'transition-colors duration-150',
        'flex items-center justify-center'
      )}
    >
      <div className="absolute inset-y-0 w-4 -translate-x-1/2" />
    </div>
  );
}
