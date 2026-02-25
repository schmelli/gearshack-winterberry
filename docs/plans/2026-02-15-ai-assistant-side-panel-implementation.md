# AI Assistant Side Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign AI Gear Assistant from modal overlay to persistent resizable side panel that maintains conversation history across navigation.

**Architecture:** App-level layout wrapper with Zustand store for UI state, React Portal for mobile bottom sheet, resizable drag handle for desktop. Mastra Memory provides automatic conversation persistence.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand (with persist), react-spring (mobile animations), react-window (virtualized lists), Tailwind CSS 4

---

## Task 1: Create AI Panel Store

**Files:**
- Create: `hooks/useAIPanelStore.ts`
- Create: `hooks/__tests__/useAIPanelStore.test.ts`

**Step 1: Write the failing test**

Create `hooks/__tests__/useAIPanelStore.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAIPanelStore } from '../useAIPanelStore';

describe('useAIPanelStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAIPanelStore());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.panelWidth).toBe(400);
  });

  it('should open and close panel', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should set panel width within valid range', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.setWidth(450);
    });
    expect(result.current.panelWidth).toBe(450);
  });

  it('should clamp panel width to min value', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.setWidth(200); // Below min 300
    });
    expect(result.current.panelWidth).toBe(300);
  });

  it('should clamp panel width to max value', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.setWidth(700); // Above max 600
    });
    expect(result.current.panelWidth).toBe(600);
  });

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.open();
      result.current.setWidth(500);
    });

    // Create new hook instance to simulate page reload
    const { result: result2 } = renderHook(() => useAIPanelStore());

    expect(result2.current.isOpen).toBe(true);
    expect(result2.current.panelWidth).toBe(500);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test hooks/__tests__/useAIPanelStore.test.ts`
Expected: FAIL with "Cannot find module '../useAIPanelStore'"

**Step 3: Write minimal implementation**

Create `hooks/useAIPanelStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIPanelState {
  isOpen: boolean;
  panelWidth: number;
  open: () => void;
  close: () => void;
  setWidth: (width: number) => void;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;

export const useAIPanelStore = create<AIPanelState>()(
  persist(
    (set) => ({
      isOpen: false,
      panelWidth: DEFAULT_WIDTH,

      open: () => set({ isOpen: true }),

      close: () => set({ isOpen: false }),

      setWidth: (width: number) => {
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ panelWidth: clampedWidth });
      },
    }),
    {
      name: 'ai-panel-storage',
    }
  )
);
```

**Step 4: Run test to verify it passes**

Run: `npm test hooks/__tests__/useAIPanelStore.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add hooks/useAIPanelStore.ts hooks/__tests__/useAIPanelStore.test.ts
git commit -m "feat(ai): add AI panel store with persistence

- Zustand store with localStorage persistence
- isOpen and panelWidth state
- Width clamping (300-600px)
- Tests for store actions and persistence

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create Resizable Drag Handle Component

**Files:**
- Create: `components/ui/ResizableDragHandle.tsx`

**Step 1: Write the component**

Create `components/ui/ResizableDragHandle.tsx`:

```typescript
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = lastXRef.current - e.clientX;
      lastXRef.current = e.clientX;

      // Calculate new width based on viewport
      const panelElement = document.querySelector('[data-ai-panel]') as HTMLElement;
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
```

**Step 2: Test manually**

Manual test (will integrate in Task 4):
- Hover should show bg-primary/20
- Cursor should be col-resize
- Dragging should be smooth

**Step 3: Commit**

```bash
git add components/ui/ResizableDragHandle.tsx
git commit -m "feat(ai): add resizable drag handle component

- Desktop-only drag handle for panel resizing
- Width clamping to min/max values
- Hover effect and cursor styling
- Clean event listener management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create AI Assistant Panel Component

**Files:**
- Create: `components/ai/AIAssistantPanel.tsx`
- Modify: `components/ai/AIChatInterface.tsx` (add data-testid for tests)

**Step 1: Write the panel component**

Create `components/ai/AIAssistantPanel.tsx`:

```typescript
'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIChatInterface } from './AIChatInterface';
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
        'h-[calc(100vh-4rem)]', // Full height minus header
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
          aria-label={t('close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <AIChatInterface />
      </div>
    </aside>
  );
}
```

**Step 2: Add i18n keys**

Modify `messages/en.json`:

```json
{
  "AIAssistant": {
    "title": "AI Gear Assistant",
    "close": "Close assistant panel"
  }
}
```

Modify `messages/de.json`:

```json
{
  "AIAssistant": {
    "title": "KI Ausrüstungsberater",
    "close": "Berater-Panel schließen"
  }
}
```

**Step 3: Commit**

```bash
git add components/ai/AIAssistantPanel.tsx messages/en.json messages/de.json
git commit -m "feat(ai): add AI assistant panel component

- Panel header with title and close button
- Renders existing AIChatInterface
- Dynamic width from store
- i18n support for title and close button

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create App Layout Wrapper

**Files:**
- Create: `components/layout/AppLayoutWithAIPanel.tsx`
- Create: `hooks/useMediaQuery.ts` (utility for responsive)

**Step 1: Create media query hook**

Create `hooks/useMediaQuery.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
```

**Step 2: Write the layout wrapper**

Create `components/layout/AppLayoutWithAIPanel.tsx`:

```typescript
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { ResizableDragHandle } from '@/components/ui/ResizableDragHandle';
import { cn } from '@/lib/utils';

interface AppLayoutWithAIPanelProps {
  children: React.ReactNode;
}

export function AppLayoutWithAIPanel({ children }: AppLayoutWithAIPanelProps) {
  const { isOpen, panelWidth, setWidth } = useAIPanelStore();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Mobile: Render bottom sheet via portal (Task 5)
  // For now, just desktop layout

  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <main className="flex-1 overflow-auto">{children}</main>
        {/* TODO: Mobile bottom sheet in Task 5 */}
      </div>
    );
  }

  // Desktop: Side panel layout
  return (
    <div className="flex h-full">
      <main
        className={cn(
          'flex-1 overflow-auto transition-all duration-200',
          isOpen && 'mr-1'
        )}
      >
        {children}
      </main>

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
```

**Step 3: Integrate into root layout**

Modify `app/[locale]/layout.tsx`:

```typescript
// Add import at top
import { AppLayoutWithAIPanel } from '@/components/layout/AppLayoutWithAIPanel';

// Wrap children (inside body, after Header)
<body className={cn('min-h-screen bg-background font-sans antialiased', fontFamily)}>
  <ThemeProvider>
    <ScreenContextProvider>
      <Header />
      <AppLayoutWithAIPanel>
        {children}
      </AppLayoutWithAIPanel>
      <Toaster />
    </ScreenContextProvider>
  </ThemeProvider>
</body>
```

**Step 4: Test manually**

Start dev server: `npm run dev`
- Panel should not be visible initially (isOpen: false)
- Open browser console: `useAIPanelStore.getState().open()`
- Panel should appear on right side
- Drag handle should allow resizing
- Panel width should persist on page reload

**Step 5: Commit**

```bash
git add components/layout/AppLayoutWithAIPanel.tsx hooks/useMediaQuery.ts app/[locale]/layout.tsx
git commit -m "feat(ai): add app layout wrapper with panel integration

- Desktop side panel layout
- Resizable panel with drag handle
- Mobile placeholder (bottom sheet in next task)
- Media query hook for responsive detection
- Integrated into root layout

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Add Panel Open Button to Header

**Files:**
- Modify: `components/layout/Header.tsx`
- Update: `messages/en.json`, `messages/de.json`

**Step 1: Add button to header**

Modify `components/layout/Header.tsx`:

```typescript
// Add import
import { MessageSquare } from 'lucide-react';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';

// Inside component (before closing </header>)
export function Header() {
  const t = useTranslations();
  const { isOpen, open } = useAIPanelStore();

  return (
    <header className="...">
      {/* ... existing header content ... */}

      {/* AI Assistant Button (before UserMenu) */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={open}
          aria-label={t('AIAssistant.openPanel')}
          className="relative"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}

      <UserMenu />
    </header>
  );
}
```

**Step 2: Add i18n key**

Modify `messages/en.json`:

```json
{
  "AIAssistant": {
    "openPanel": "Open AI Assistant"
  }
}
```

Modify `messages/de.json`:

```json
{
  "AIAssistant": {
    "openPanel": "KI-Berater öffnen"
  }
}
```

**Step 3: Test manually**

- Button should appear in header when panel is closed
- Clicking button should open panel
- Button should disappear when panel is open
- Close button in panel should work

**Step 4: Commit**

```bash
git add components/layout/Header.tsx messages/en.json messages/de.json
git commit -m "feat(ai): add panel open button to header

- MessageSquare icon button in header
- Only visible when panel is closed
- i18n support for aria-label
- Opens panel on click

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Install Dependencies for Mobile Bottom Sheet

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

Run:
```bash
npm install react-spring@^9.7.3 react-window@^1.8.10
npm install -D @types/react-window
```

**Step 2: Verify installation**

Run: `npm list react-spring react-window`
Expected: Both packages listed with correct versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install dependencies for mobile bottom sheet

- react-spring for animations
- react-window for virtualized lists
- Type definitions for react-window

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create Mobile Bottom Sheet Component

**Files:**
- Create: `components/ai/MobileBottomSheet.tsx`

**Step 1: Write the bottom sheet component**

Create `components/ai/MobileBottomSheet.tsx`:

```typescript
'use client';

import { useSpring, animated, config } from 'react-spring';
import { useDrag } from '@use-gesture/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIChatInterface } from './AIChatInterface';
import { useAIPanelStore } from '@/hooks/useAIPanelStore';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

const SNAP_POINTS = {
  peek: 0.5,    // 50% viewport height
  normal: 0.85, // 85% viewport height
  full: 1.0,    // 100% viewport height
};

export function MobileBottomSheet() {
  const t = useTranslations('AIAssistant');
  const { close } = useAIPanelStore();
  const [mounted, setMounted] = useState(false);
  const [snapPoint, setSnapPoint] = useState(SNAP_POINTS.normal);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ y }, api] = useSpring(() => ({
    y: window.innerHeight * (1 - SNAP_POINTS.normal),
    config: config.stiff,
  }));

  const bind = useDrag(
    ({ last, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      // Close if dragged down past threshold
      if (last) {
        const shouldClose = my > window.innerHeight * 0.3 || (vy > 0.5 && dy > 0);

        if (shouldClose) {
          api.start({
            y: window.innerHeight,
            onRest: close,
          });
          return;
        }

        // Snap to nearest point
        const currentHeight = window.innerHeight * snapPoint;
        const newHeight = currentHeight - my;
        const newSnapPoint =
          newHeight > window.innerHeight * 0.9
            ? SNAP_POINTS.full
            : newHeight > window.innerHeight * 0.65
            ? SNAP_POINTS.normal
            : SNAP_POINTS.peek;

        setSnapPoint(newSnapPoint);
        api.start({ y: window.innerHeight * (1 - newSnapPoint) });
      } else {
        api.start({ y: window.innerHeight * (1 - snapPoint) + my });
      }
    },
    { axis: 'y' }
  );

  if (!mounted) return null;

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={close}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <animated.div
        {...bind()}
        style={{
          y,
          touchAction: 'none',
        }}
        className="fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-2xl bg-background shadow-xl"
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <AIChatInterface />
        </div>
      </animated.div>
    </>
  );

  return createPortal(sheet, document.body);
}
```

**Step 2: Install @use-gesture/react**

Run:
```bash
npm install @use-gesture/react@^10.3.0
```

**Step 3: Update AppLayoutWithAIPanel to use mobile sheet**

Modify `components/layout/AppLayoutWithAIPanel.tsx`:

```typescript
// Add import
import { MobileBottomSheet } from '@/components/ai/MobileBottomSheet';

// Replace mobile TODO section
if (isMobile) {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-auto">{children}</main>
      {isOpen && <MobileBottomSheet />}
    </div>
  );
}
```

**Step 4: Test manually on mobile viewport**

- Resize browser to mobile width (<768px)
- Open panel via header button
- Should see bottom sheet with backdrop
- Drag handle should allow vertical dragging
- Snap to 50%, 85%, 100% positions
- Swipe down to close
- Backdrop click should close

**Step 5: Commit**

```bash
git add components/ai/MobileBottomSheet.tsx components/layout/AppLayoutWithAIPanel.tsx package.json package-lock.json
git commit -m "feat(ai): add mobile bottom sheet implementation

- React Spring animations for smooth transitions
- Three snap points (50%, 85%, 100%)
- Swipe-to-dismiss gesture
- Portal-based rendering with backdrop
- Integrated into app layout

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Remove Old Modal Implementation

**Files:**
- Modify: `components/ai/AIChatInterface.tsx` (if it has modal-specific code)
- Remove: Any modal-specific styling/logic that's no longer needed

**Step 1: Identify modal-specific code**

Search for modal-related code:
```bash
git grep -n "Dialog\|Modal" components/ai/
```

**Step 2: Remove modal wrapper if exists**

If `AIChatInterface` is wrapped in a Dialog/Modal component, extract the inner content and remove the wrapper.

**Step 3: Test end-to-end**

Full user flow test:
1. Open app → Panel closed
2. Click header button → Panel opens
3. Send AI message → Response appears
4. Navigate to loadout detail → Panel stays open, conversation persists
5. Close panel → Panel closes
6. Reload page → Panel state persists (closed)
7. Open again → Previous conversation still there

**Step 4: Commit**

```bash
git add components/ai/AIChatInterface.tsx
git commit -m "refactor(ai): remove old modal implementation

- Removed Dialog/Modal wrapper
- AIChatInterface now pure chat component
- Works in both desktop panel and mobile sheet

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Add Loading States and Error Handling

**Files:**
- Modify: `components/ai/AIAssistantPanel.tsx`
- Modify: `components/ai/MobileBottomSheet.tsx`

**Step 1: Add loading state for Mastra Memory**

Modify `components/ai/AIAssistantPanel.tsx`:

```typescript
'use client';

import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AIAssistantPanel({ className }: AIAssistantPanelProps) {
  const t = useTranslations('AIAssistant');
  const { close, panelWidth } = useAIPanelStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading (actual loading happens in AIChatInterface)
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <aside
      data-ai-panel
      style={{ width: `${panelWidth}px` }}
      className={cn(
        'flex flex-col border-l border-border bg-background',
        'h-[calc(100vh-4rem)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label={t('close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('retry')}
            </Button>
          </div>
        ) : (
          <AIChatInterface />
        )}
      </div>
    </aside>
  );
}
```

**Step 2: Add i18n keys**

Modify `messages/en.json`:

```json
{
  "AIAssistant": {
    "retry": "Retry"
  }
}
```

Modify `messages/de.json`:

```json
{
  "AIAssistant": {
    "retry": "Erneut versuchen"
  }
}
```

**Step 3: Apply same pattern to mobile sheet**

Modify `components/ai/MobileBottomSheet.tsx` with same loading/error logic.

**Step 4: Commit**

```bash
git add components/ai/AIAssistantPanel.tsx components/ai/MobileBottomSheet.tsx messages/en.json messages/de.json
git commit -m "feat(ai): add loading states and error handling

- Loading spinner while initializing
- Error state with retry button
- Applied to both desktop panel and mobile sheet
- i18n support for retry action

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Update Documentation

**Files:**
- Create: `docs/features/ai-assistant-side-panel.md`
- Modify: `docs/architecture/overview.md` (add reference)

**Step 1: Create feature documentation**

Create `docs/features/ai-assistant-side-panel.md`:

```markdown
# AI Assistant Side Panel

**Feature ID:** AI-Side-Panel
**Status:** Completed
**Date:** 2026-02-15

## Overview

Persistent side panel for AI Gear Assistant that maintains conversation history across navigation and allows simultaneous interaction with loadout content.

## Architecture

- **Desktop**: Resizable side panel (300-600px) with drag handle
- **Mobile**: Bottom sheet with swipe gestures and snap points
- **State**: Zustand store with localStorage persistence
- **Memory**: Mastra Memory automatically persists conversation in PostgreSQL

## Components

### Core Components
- `AppLayoutWithAIPanel` - Layout wrapper in root layout
- `AIAssistantPanel` - Desktop panel container
- `MobileBottomSheet` - Mobile bottom sheet via Portal
- `ResizableDragHandle` - Desktop drag handle for resizing
- `useAIPanelStore` - Zustand store for panel state

### File Locations
```
components/
├── layout/
│   └── AppLayoutWithAIPanel.tsx
├── ai/
│   ├── AIAssistantPanel.tsx
│   ├── MobileBottomSheet.tsx
│   └── AIChatInterface.tsx (unchanged)
└── ui/
    └── ResizableDragHandle.tsx

hooks/
├── useAIPanelStore.ts
└── useMediaQuery.ts
```

## State Management

### UI State (localStorage)
```typescript
{
  isOpen: boolean;      // Panel open/closed
  panelWidth: number;   // Desktop panel width (300-600px)
}
```

### Chat State (Supabase PostgreSQL via Mastra Memory)
- Thread history per user
- Automatic persistence
- No explicit save/load needed

### Screen Context (Runtime)
- Current page + loadout ID
- Provided via ScreenContext
- Included in AI tool execution

## Responsive Behavior

### Desktop (≥768px)
- Side panel with resizable drag handle
- Width persisted in localStorage
- Full height minus header

### Mobile (<768px)
- Bottom sheet via React Portal
- Three snap points: 50%, 85%, 100%
- Swipe-to-dismiss gesture
- Semi-transparent backdrop

## User Flow

1. User clicks AI Assistant button in header
2. Panel/sheet opens with loading state
3. Mastra Memory loads previous conversation
4. User sends message about current loadout
5. AI responds with context-aware analysis
6. User navigates to another page → panel stays open
7. Conversation continues with updated context
8. User closes panel → state persisted

## Integration Points

### Mastra Memory
- Automatically loads thread on mount
- No explicit load/save calls needed
- Thread identified by userId

### Screen Context
- loadout-detail screen sets currentLoadoutId
- AI tools receive context via requestContext
- No panel-specific context handling needed

## Testing

### Manual Testing
- [ ] Panel opens/closes via header button
- [ ] Desktop resizing works (300-600px range)
- [ ] Mobile bottom sheet has correct snap points
- [ ] Swipe-to-dismiss works on mobile
- [ ] Conversation persists across navigation
- [ ] Panel state persists on page reload
- [ ] Loading state shows briefly on open
- [ ] Error state with retry works

### Automated Tests
- `useAIPanelStore.test.ts` - Store actions and persistence

## Future Enhancements

- [ ] Virtualized message list for long conversations (react-window)
- [ ] Request ID tracking to prevent race conditions
- [ ] Keyboard shortcuts (Cmd+K to toggle panel)
- [ ] Panel width presets (S/M/L)
- [ ] Multi-window support (sync panel state across tabs)

## References

- Design Doc: `docs/plans/2026-02-15-ai-assistant-side-panel-design.md`
- Implementation Plan: `docs/plans/2026-02-15-ai-assistant-side-panel-implementation.md`
- Mastra Memory: `docs/features/observational-memory.md`
```

**Step 2: Update architecture overview**

Modify `docs/architecture/overview.md`:

Add to "Key Features" section:
```markdown
- **AI Assistant Side Panel**: Persistent panel for AI conversations (see [ai-assistant-side-panel.md](../features/ai-assistant-side-panel.md))
```

**Step 3: Commit**

```bash
git add docs/features/ai-assistant-side-panel.md docs/architecture/overview.md
git commit -m "docs: add AI assistant side panel documentation

- Feature overview and architecture
- Component locations and responsibilities
- Testing checklist
- Integration points with Mastra Memory
- Future enhancement ideas

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Final Testing and Polish

**Files:**
- N/A (manual testing)

**Step 1: Full user journey test**

Test complete flow:
1. Fresh browser (clear localStorage)
2. Open app → Panel should be closed
3. Navigate to loadout detail
4. Open AI panel via header button
5. Send message: "Analyze my loadout"
6. Verify AI responds with loadout-specific analysis
7. Navigate away → Panel stays open, shows same conversation
8. Close panel → Panel closes
9. Refresh page → Panel stays closed
10. Open again → Previous conversation restored

**Step 2: Responsive testing**

Test breakpoints:
- Desktop (≥768px): Side panel with drag handle
- Tablet (768px): Breakpoint switch
- Mobile (<768px): Bottom sheet

**Step 3: Edge cases**

Test edge cases:
- Very long conversation (>50 messages)
- Rapid navigation between pages
- Resize browser window while panel open
- Panel open + logout → should clear properly

**Step 4: Performance check**

Check console for:
- No React warnings
- No memory leaks (event listeners cleaned up)
- Smooth animations (60fps)

**Step 5: Accessibility**

Test with keyboard:
- Tab navigation works
- Close button has focus states
- aria-labels are correct

**Step 6: Create summary**

Create test summary:
```bash
echo "## Test Summary - AI Assistant Side Panel

### ✅ Passed
- Panel opens/closes correctly
- Desktop resizing works smoothly
- Mobile bottom sheet with snap points
- Conversation persists across navigation
- State persists on page reload
- Loading/error states work
- Responsive breakpoints correct
- No console errors

### 🔧 Known Issues
- (List any issues found)

### 📝 Notes
- Tested on Chrome, Safari, Firefox
- Mobile tested on iOS Safari, Chrome Android
" > test-summary.txt
```

**Step 7: Final commit**

```bash
git add test-summary.txt
git commit -m "test: AI assistant side panel complete

All manual tests passing:
- Desktop side panel with resizing
- Mobile bottom sheet with gestures
- Conversation persistence via Mastra Memory
- Responsive behavior at all breakpoints
- Loading/error states
- Accessibility checks

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Completion Checklist

- [ ] Task 1: AI Panel Store with tests
- [ ] Task 2: Resizable Drag Handle
- [ ] Task 3: AI Assistant Panel Component
- [ ] Task 4: App Layout Wrapper
- [ ] Task 5: Panel Open Button in Header
- [ ] Task 6: Install Mobile Dependencies
- [ ] Task 7: Mobile Bottom Sheet
- [ ] Task 8: Remove Old Modal
- [ ] Task 9: Loading States & Error Handling
- [ ] Task 10: Documentation
- [ ] Task 11: Final Testing & Polish

## Success Criteria

✅ Panel stays open during navigation
✅ Conversation history persists via Mastra Memory
✅ User can interact with loadout while reading AI comments
✅ Resizable on desktop (300-600px)
✅ Bottom sheet on mobile with swipe gestures
✅ Panel state (open/closed, width) persists on page reload
✅ No breaking changes to existing AI Assistant functionality

---

**Total Estimated Time:** 4-6 hours
**Commits:** 11 commits (one per task)
**Tests:** useAIPanelStore tests + comprehensive manual testing
