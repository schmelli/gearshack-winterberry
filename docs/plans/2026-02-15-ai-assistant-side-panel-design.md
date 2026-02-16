# AI Assistant Side Panel Design

**Date:** 2026-02-15
**Feature:** AI Gear Assistant Redesign
**Status:** Approved

## Executive Summary

Redesign the AI Gear Assistant from a modal overlay to a persistent side panel that stays open during navigation, maintains conversation history via Mastra Memory, and allows simultaneous interaction with loadout content.

**Key Benefits:**
- Persistent conversation context across page navigation
- No interruption when switching between chat and loadout editing
- Natural back-and-forth dialogue about gear and loadouts
- Better UX for iterative refinement of pack lists

## Problem Statement

Current implementation uses a modal overlay that:
- Closes when clicking outside, losing conversation context
- Forces user to choose between viewing chat or editing loadout
- Resets to empty state on each open
- Makes iterative conversations difficult

User feedback:
> "Wenn man die Kommentare in der Packliste checken will, dann klickt man das Modal weg - und beim nächsten Aufruf ist alles leer... Es wäre besser, wenn wir den AI Gear Assistant als Panel an der rechten Seite bauen - wo die Inhalte stehen und lesbar bleiben, auch wenn ich wieder in die Packliste klicke."

## Architectural Approach

**Selected Approach: App-Level Layout Wrapper** ✅

### Rationale
- Simplest state management (panel stays mounted during navigation)
- Natural integration with Next.js App Router layouts
- Mastra Memory persistence "just works" (no special handling needed)
- Clear separation: layout orchestration vs. chat logic

### Rejected Alternatives
- **Portal-Based Floating Panel**: Complex z-index management, state synchronization issues
- **Route-Level Components**: Panel unmounts on navigation, requires complex state preservation

## Architecture Overview

### Component Hierarchy
```
app/[locale]/layout.tsx
└── AppLayoutWithAIPanel
    ├── main (flex-1, Hauptinhalt mit children)
    └── AIAssistantPanel (conditional render wenn isOpen)
        ├── ResizableDragHandle (Desktop only)
        ├── PanelHeader (Titel, Close Button)
        └── ChatInterface (existierende AIChatInterface)
```

### State Management
```typescript
// Zustand Store mit localStorage persistence
useAIPanelStore: {
  isOpen: boolean;
  panelWidth: number; // 300-600px, default 400px
  open: () => void;
  close: () => void;
  setWidth: (width: number) => void;
}
```

**State Sources:**
- **localStorage**: Panel UI state (`isOpen`, `panelWidth`)
- **Supabase PostgreSQL**: Mastra Thread History (chat data)
- **ScreenContext**: Current page + LoadoutId (runtime context)

No complex synchronization needed - three independent state sources.

## Component Design

### AppLayoutWithAIPanel
**File:** `components/layout/AppLayoutWithAIPanel.tsx`

```typescript
// Responsibilities:
- Layout orchestration only (no business logic)
- Render flex container with main + conditional panel
- Desktop: main (dynamic width) + ResizableDragHandle + Panel
- Mobile: main (100%) + Portal-based Bottom Sheet (when isOpen)
```

### AIAssistantPanel
**File:** `components/ai/AIAssistantPanel.tsx`

```typescript
// Responsibilities:
- Panel container with header + close button
- Renders existing <AIChatInterface> component (unchanged)
- Desktop: Fixed width from store, height 100%, overflow-y-auto
- Mobile: Bottom Sheet with react-spring animation (50%, 85%, 100% heights)
- Swipe-to-dismiss gesture for mobile
```

### ResizableDragHandle
**File:** `components/ui/ResizableDragHandle.tsx`

```typescript
// Desktop only - vertical drag handle
- 4px wide area between main and panel
- onMouseDown → document.addEventListener mousemove
- Calculates new width, clamped to 300-600px
- Calls store.setWidth() during drag
- Hover effect: bg-primary/20, cursor: col-resize
```

### Integration with Existing Code
- **AIChatInterface**: No changes needed, simply rendered in panel instead of modal
- **Mastra Memory**: Automatically loads thread history (no code changes)
- **ScreenContext**: Integration remains unchanged (provided via Context Provider)

## Data Flow

### Mastra Memory Persistence
```
Component mounts → AIChatInterface initializes →
API Call: GET /api/mastra/threads?userId={userId} →
Mastra Memory auto-loads latest thread from PostgreSQL →
Chat history displayed in UI
```

**Key Points:**
- One global thread per user (identified by `userId`)
- First open: Empty chat if no thread exists
- On navigation: Thread remains loaded, new messages appended
- No code changes needed - Mastra Memory already persists everything

### ScreenContext Integration
```
User navigates to Loadout → useLoadoutScreenEffect() sets context →
ScreenContext Provider updates → AIChatInterface doesn't re-render →
Next user message includes current screen + loadoutId →
Tools (analyzeLoadout) use currentLoadoutId from requestContext
```

**Key Points:**
- Context only included in new messages, not on every navigation event
- Panel shows previous messages during navigation (no flash/reload)
- No reload of chat when switching between Loadout Detail and other pages

### Panel Open/Close Flow
```
User clicks open button → store.open() → Panel mounted → Mastra Memory loads thread
User closes panel → store.close() → Panel unmounted, isOpen: false in localStorage
On page reload: Panel state restored from localStorage
```

## Responsive Design

### Desktop (≥768px)
```
Layout: [Main Content (flex-1)] [Drag Handle (4px)] [AI Panel (300-600px)]

- Panel is resizable via drag handle
- Default width: 400px (from localStorage or initial)
- Min width: 300px (enough space for chat bubbles)
- Max width: 600px (prevents too narrow main content)
- Panel height: 100vh minus header
- Position: fixed right, top below header
```

### Mobile (<768px)
```
Layout: [Main Content (100%)] + [Bottom Sheet (Portal)]

- Bottom sheet rendered via React Portal (over main content)
- Three snap positions: 50% (peek), 85% (normal), 100% (fullscreen)
- Swipe-to-dismiss: Drag down closes panel
- Backdrop: Semi-transparent overlay (bg-black/50)
- Animation: react-spring for smooth transitions
```

### Breakpoint Handling
```typescript
const isMobile = useMediaQuery('(max-width: 767px)');

// Desktop: Inline panel
{!isMobile && isOpen && (
  <>
    <ResizableDragHandle />
    <AIAssistantPanel />
  </>
)}

// Mobile: Portal-based bottom sheet
{isMobile && isOpen && (
  <Portal>
    <MobileBottomSheet />
  </Portal>
)}
```

### Content Preservation
- On browser resize (Desktop ↔ Mobile): Panel unmounts → remounts
- **BUT**: Mastra thread stays in PostgreSQL → chat history preserved
- User sees brief flash on breakpoint change, but no data loss
- Alternative (more complex): Always render both, toggle visibility

## Error Handling & Edge Cases

### Mastra Memory Errors
```typescript
// If thread cannot be loaded
- Show error toast: "Konversation konnte nicht geladen werden"
- Fallback: Empty chat (user can start new conversation)
- Retry button in panel header
- Log to Sentry for debugging
```

### Offline Behavior
- Panel stays open (UI functional)
- Message send fails → Toast: "Keine Internetverbindung"
- Last loaded messages remain visible
- No auto-reload on reconnect (user must manually refresh)

### Long Conversations
- Mastra Memory already has Observational Memory (compresses after 20k tokens)
- UI: Virtualized list for >100 messages (react-window)
- Scroll position: Anchored to newest message
- Load More button for older messages (if Mastra supports)

### Race Conditions
```typescript
// User navigates quickly between loadouts
Problem: ScreenContext updates, but AI still responding to old context
Solution: Request ID in message metadata
- Each message gets requestId + screenContext snapshot
- When response arrives: Compare requestId
- On mismatch: Show warning "Antwort bezieht sich auf vorherige Seite"
```

### Resize Edge Cases
- Min/Max width enforcement in drag handler
- Fast dragging: requestAnimationFrame throttling
- Touch devices in desktop mode: Drag works with touch too
- Dragging beyond viewport: Cursor tracking stops at viewport edge

### Panel State Inconsistencies
- localStorage corrupted: Fallback to defaults (isOpen: false, width: 400)
- Panel width out of range: Clamp to 300-600px
- On cleanup: removeEventListener for drag events (avoid memory leaks)

### Navigation During Message Streaming
- Stream continues even after navigation
- Message is fully received and displayed
- No abort on navigation (user still sees answer)

## Implementation Notes

### New Files
```
components/layout/AppLayoutWithAIPanel.tsx
components/ai/AIAssistantPanel.tsx (new wrapper)
components/ui/ResizableDragHandle.tsx
hooks/useAIPanelStore.ts
```

### Modified Files
```
app/[locale]/layout.tsx (wrap children with AppLayoutWithAIPanel)
components/layout/Header.tsx (add button to open AI panel)
```

### Dependencies
```json
{
  "react-spring": "^9.7.3",  // Mobile bottom sheet animations
  "react-window": "^1.8.10"  // Virtualized chat messages
}
```

### Environment Variables
No new environment variables needed. Uses existing:
- `DATABASE_URL` (Mastra Memory PostgreSQL)
- `AI_GATEWAY_API_KEY` (Mastra Agent)

## Success Criteria

✅ Panel stays open during page navigation
✅ Conversation history persists via Mastra Memory
✅ User can interact with loadout while reading AI comments
✅ Resizable on desktop (300-600px)
✅ Bottom sheet on mobile with swipe gestures
✅ Panel state (open/closed, width) persists on page reload
✅ No breaking changes to existing AI Assistant functionality

## Next Steps

1. **Implementation Planning**: Use writing-plans skill to create detailed implementation plan
2. **Development**: Follow feature-sliced light architecture
3. **Testing**: Manual testing on desktop and mobile viewports
4. **Documentation**: Update feature docs with new architecture

---

**Design Approved By:** User
**Ready for Implementation:** Yes
