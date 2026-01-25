# TODO: User Profile Management UI

**Priority**: Low (implement after core memory system is stable)
**Depends on**: 002-mastra-memory-system Phase 2 (Working Memory)
**Created**: 2026-01-25

## Overview

Allow users to view, edit, and manage what the AI agent "knows" about them via a settings panel. This provides transparency and control over the agent's learned profile.

---

## User Stories

### Story 1: View My Profile
> As a user, I want to see what the AI agent knows about me, so I can understand why it makes certain recommendations.

**Acceptance Criteria:**
- Settings page has "AI Memory" or "Agent Profile" section
- Displays all working memory fields in readable format
- Shows when each fact was learned (timestamp)
- Differentiates between user-provided vs agent-learned data

### Story 2: Edit My Preferences
> As a user, I want to correct mistakes in my profile, so the agent gives better recommendations.

**Acceptance Criteria:**
- Users can edit: name, location, preferences, activities
- Changes save immediately with optimistic UI
- Agent uses updated values in next conversation
- Validation prevents invalid data (Zod schema)

### Story 3: Delete Specific Facts
> As a user, I want to remove facts the agent learned incorrectly, without losing everything.

**Acceptance Criteria:**
- Each learned fact has a "Remove" button
- Confirmation dialog for deletion
- Removed facts don't reappear unless user explicitly states them again

### Story 4: Clear All Memory
> As a user, I want to start fresh with the AI agent, forgetting everything it learned.

**Acceptance Criteria:**
- "Reset AI Memory" button with strong warning
- Clears working memory but preserves conversation history
- Option to also clear semantic recall (embeddings)
- GDPR-compliant (links to existing deletion flow)

### Story 5: Export My Profile
> As a user, I want to download what the AI knows about me for transparency.

**Acceptance Criteria:**
- "Export" button downloads JSON file
- Includes all working memory fields
- Human-readable format with descriptions

---

## UI Design

### Location
Settings > AI Assistant > "What I Know About You"

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  What I Know About You                              [Export]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IDENTITY                                           [Edit]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Name: Sarah                                            │ │
│  │ Location: Colorado, USA                                │ │
│  │ Language: English                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  GEAR PHILOSOPHY                                    [Edit]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Weight Priority: Ultralight                            │ │
│  │ Budget Range: Mid-range to Premium                     │ │
│  │ Quality vs Weight: Weight priority                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ACTIVITIES                                         [Edit]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Primary: Backpacking, Thru-hiking                      │ │
│  │ Experience: Advanced                                   │ │
│  │ Typical Trips: Week-long to Thru-hikes                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  BRAND PREFERENCES                                  [Edit]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Favorites: Zpacks, Gossamer Gear, Enlightened Equip.   │ │
│  │ Avoid: None specified                                  │ │
│  │ Curious about: Durston, Tarptent                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  UPCOMING TRIPS                                     [Edit]  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • PCT Thru-hike - May 2026                    [Remove] │ │
│  │ • Colorado Trail - August 2026                [Remove] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  LEARNED FACTS                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • "Prefers quilts over sleeping bags"         [Remove] │ │
│  │   Learned: Jan 15, 2026 • Confidence: High             │ │
│  │                                                        │ │
│  │ • "Has knee issues, needs trekking poles"     [Remove] │ │
│  │   Learned: Jan 20, 2026 • Confidence: Medium           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Reset AI Memory]  Forget everything and start fresh       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### API Routes

```typescript
// app/api/user/ai-profile/route.ts
GET  /api/user/ai-profile     // Get current profile
PUT  /api/user/ai-profile     // Update profile fields
DELETE /api/user/ai-profile   // Clear all working memory

// app/api/user/ai-profile/facts/[factIndex]/route.ts
DELETE /api/user/ai-profile/facts/:index  // Remove specific fact

// app/api/user/ai-profile/export/route.ts
GET /api/user/ai-profile/export  // Download as JSON
```

### Components

```
components/settings/
├── AIProfileSection.tsx       // Main settings section
├── ProfileCard.tsx            // Individual editable card
├── LearnedFactsList.tsx       // Facts with remove buttons
├── UpcomingTripsList.tsx      // Trips with remove buttons
├── ResetMemoryDialog.tsx      // Confirmation dialog
└── ExportProfileButton.tsx    // Export functionality
```

### Hooks

```typescript
// hooks/useAIProfile.ts
export function useAIProfile() {
  // Fetch and mutate working memory
  // Optimistic updates
  // Zod validation
}
```

---

## i18n Keys

```json
{
  "AIProfile": {
    "title": "What I Know About You",
    "description": "The AI assistant learns about your preferences over time. You can view and edit this information.",
    "sections": {
      "identity": "Identity",
      "philosophy": "Gear Philosophy",
      "activities": "Activities",
      "brands": "Brand Preferences",
      "trips": "Upcoming Trips",
      "facts": "Learned Facts"
    },
    "actions": {
      "edit": "Edit",
      "remove": "Remove",
      "export": "Export",
      "reset": "Reset AI Memory"
    },
    "reset": {
      "title": "Reset AI Memory?",
      "description": "This will clear everything the AI has learned about you. Your conversation history will be preserved.",
      "confirm": "Yes, Reset Memory",
      "cancel": "Cancel"
    },
    "confidence": {
      "high": "High confidence",
      "medium": "Medium confidence",
      "low": "Low confidence"
    },
    "empty": {
      "facts": "No facts learned yet. Chat with the AI assistant to build your profile.",
      "trips": "No upcoming trips. Tell the AI about your plans!"
    }
  }
}
```

---

## Privacy Considerations

1. **Transparency**: Users can see exactly what's stored
2. **Control**: Users can edit or delete any data
3. **Portability**: Export feature for data access requests
4. **Deletion**: Full reset respects GDPR Right to Erasure
5. **No Surprises**: Agent confirms when learning new facts

---

## Implementation Estimate

| Task | Effort |
|------|--------|
| API routes | 1 day |
| Settings UI components | 2 days |
| Edit dialogs | 1 day |
| Export functionality | 0.5 day |
| Reset flow with GDPR | 1 day |
| i18n (en + de) | 0.5 day |
| Testing | 1 day |
| **Total** | **~7 days** |

---

## Open Questions (To Resolve Before Implementation)

1. Should semantic recall (embeddings) be clearable separately from working memory?
2. Should there be a "pause learning" toggle to temporarily stop profile updates?
3. Should we show the agent's confidence level for preferences (not just facts)?
4. Should conversation history be exportable alongside the profile?

---

## Related Specs

- `specs/002-mastra-memory-system/spec.md` - Core memory implementation
- `specs/008-auth-and-profile/` - User profile architecture
- GDPR deletion flow in `lib/mastra/gdpr.ts`
