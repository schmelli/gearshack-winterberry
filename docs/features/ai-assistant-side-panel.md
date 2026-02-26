# AI Assistant Side Panel

**Status:** Completed
**Date:** 2026-02-16
**Branch:** feature/ai-assistant-side-panel

## Overview

Persistent side panel for AI Gear Assistant that maintains conversation history across navigation and allows simultaneous interaction with loadout content. Replaces the previous modal overlay.

## Architecture

- **Desktop (>=768px)**: Resizable side panel (300-600px) with drag handle
- **Mobile (<768px)**: Bottom sheet with touch drag gestures and snap points
- **State**: Zustand store with localStorage persistence
- **Memory**: Mastra Memory automatically persists conversation in PostgreSQL

## Components

### File Locations
```
components/
├── layout/
│   ├── AppLayoutWithAIPanel.tsx   # Layout wrapper (desktop panel / mobile sheet)
│   └── Shell.tsx                  # Modified to include AppLayoutWithAIPanel
├── ai-assistant/
│   ├── AIAssistantPanel.tsx       # Desktop panel container
│   ├── MobileBottomSheet.tsx      # Mobile bottom sheet via Portal
│   ├── AIPanelErrorBoundary.tsx   # Error boundary with retry
│   └── ChatInterface.tsx          # Unchanged - shared chat UI
└── ui/
    └── ResizableDragHandle.tsx    # Desktop drag handle

hooks/
├── useAIPanelStore.ts             # Zustand store (isOpen, panelWidth)
└── useMediaQuery.ts               # Pre-existing responsive hook
```

### Component Responsibilities

| Component | Purpose |
|-----------|---------|
| `AppLayoutWithAIPanel` | Detects mobile/desktop, renders appropriate panel variant |
| `AIAssistantPanel` | Desktop wrapper with close button, sets panel width |
| `MobileBottomSheet` | Portal-rendered sheet with snap points and swipe gestures |
| `ResizableDragHandle` | Mouse-based drag handle for desktop panel resizing |
| `AIPanelErrorBoundary` | React ErrorBoundary with i18n error messages and retry |
| `ChatInterface` | Shared chat UI (unchanged from modal implementation) |

## State Management

### UI State (localStorage via Zustand persist)
```typescript
{
  isOpen: boolean;      // Panel open/closed
  panelWidth: number;   // Desktop panel width (300-600px)
}
```

### Chat State (Supabase PostgreSQL via Mastra Memory)
- Thread history per user, automatic persistence
- No explicit save/load needed

## Responsive Behavior

### Desktop (>=768px)
- Side panel with resizable drag handle
- Width persisted in localStorage (300-600px range)
- Full height minus header (h-[calc(100vh-6rem)])

### Mobile (<768px)
- Bottom sheet via React Portal
- Three snap points: 50%, 85%, 100% viewport height
- Swipe-to-dismiss with velocity detection
- CSS transitions (no extra dependencies)

## Changes from Previous Modal

| Aspect | Before (Modal) | After (Side Panel) |
|--------|----------------|-------------------|
| Display | Full-screen overlay | Side panel / bottom sheet |
| Navigation | Closes on navigate | Stays open |
| Content access | Blocked by overlay | Visible alongside panel |
| Opening | Modal state in SiteHeader | Zustand store |
| Dependencies | @radix-ui/react-dialog | None additional |

## Testing

### Automated Tests
- `hooks/__tests__/useAIPanelStore.test.ts` - 6 tests for store actions and clamping

### Manual Testing Checklist
- [ ] Panel opens/closes via header button
- [ ] Desktop resizing works (300-600px range)
- [ ] Mobile bottom sheet has correct snap points
- [ ] Swipe-to-dismiss works on mobile
- [ ] Conversation persists across navigation
- [ ] Panel state persists on page reload
- [ ] Error boundary catches crashes with retry
- [ ] Button hidden when panel is open
- [ ] Auth/landing routes unaffected

## References

- Design Doc: `docs/plans/2026-02-15-ai-assistant-side-panel-design.md`
- Implementation Plan: `docs/plans/2026-02-15-ai-assistant-side-panel-implementation.md`
- Mastra Memory: `docs/features/observational-memory.md`
