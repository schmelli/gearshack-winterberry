# API Contract: Supabase Realtime Synchronization

**Feature**: 050-ai-assistant | **Contract Type**: Realtime Events | **Date**: 2025-12-16

## Overview

Defines event schemas and subscription patterns for multi-session synchronization using Supabase Realtime. Ensures conversations sync across all active tabs and devices within 2 seconds (SC-015).

## Architecture Pattern

**Hybrid Approach**:
1. **Postgres Changes** - Persistent messages (INSERT events on `messages` table)
2. **Broadcast** - Ephemeral events (typing indicators, context updates, rate limit notifications)

**Rationale** (from research.md):
- Postgres Changes: 46ms P50, 132ms P95 latency (reliable for critical data)
- Broadcast: 6ms P50, 28ms P95 latency (optimal for high-frequency events)

---

## 1. Postgres Changes Subscription (Messages)

### Event: New Message Inserted

**Subscription Pattern**:

```typescript
const messageChannel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    handleNewMessage(payload.new as Message);
  })
  .subscribe();
```

### Payload Schema

```typescript
interface PostgresChangesPayload<T> {
  schema: 'public';
  table: 'messages';
  commit_timestamp: string; // ISO 8601
  eventType: 'INSERT';
  new: T; // New message record
  old: null; // Not used for INSERT
  errors: null; // Null if no errors
}

interface Message {
  id: string; // UUID
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string; // ISO 8601 timestamp
  inline_cards: InlineCard[] | null;
  actions: Action[] | null;
  context: MessageContext | null;
  tokens_used: number | null;
}
```

### Client-Side Handler

```typescript
function handleNewMessage(message: Message) {
  // 1. Check if message already exists (prevent duplicates)
  const exists = messages.some((m) => m.id === message.id);
  if (exists) return;

  // 2. Add message to local state
  setMessages((prev) => [...prev, message]);

  // 3. Update conversation timestamp
  setLastMessageAt(new Date(message.created_at));

  // 4. Play notification sound (if from another tab)
  if (message.role === 'assistant' && !document.hasFocus()) {
    playNotificationSound();
  }

  // 5. Scroll to bottom
  scrollToBottom();
}
```

### Expected Latency

**Target**: P95 < 200ms (per research.md)

**Monitoring**:
```typescript
const startTime = Date.now();

// On message received
const syncLatency = Date.now() - new Date(payload.commit_timestamp).getTime();
recordMetric('sync.message.latency', syncLatency);
```

---

## 2. Broadcast Events (Ephemeral)

### Event: Typing Indicator

**Purpose**: Show when user is typing in another tab/device

**Send Pattern**:

```typescript
const channel = supabase.channel(`conversation:${conversationId}`);

// Throttle to 300ms (avoid excessive broadcasts)
const sendTypingIndicator = throttle((isTyping: boolean) => {
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      userId: currentUser.id,
      tabId: currentTabId, // Unique tab identifier (crypto.randomUUID())
      isTyping,
      timestamp: new Date().toISOString(),
    },
  });
}, 300);
```

**Receive Pattern**:

```typescript
channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
  // Ignore events from current tab
  if (payload.tabId === currentTabId) return;

  // Update typing indicator UI
  setIsOtherUserTyping(payload.isTyping);

  // Auto-clear after 3 seconds
  if (payload.isTyping) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => setIsOtherUserTyping(false), 3000);
  }
});
```

**Payload Schema**:

```typescript
interface TypingIndicatorPayload {
  userId: string; // User who is typing
  tabId: string; // Tab/device identifier
  isTyping: boolean; // true when typing, false when stopped
  timestamp: string; // ISO 8601
}
```

**Expected Latency**: P95 < 30ms (Broadcast latency)

---

### Event: Context Update

**Purpose**: Sync user context changes across tabs (screen navigation, locale change)

**Send Pattern**:

```typescript
// When user navigates to new screen
function updateContext(newContext: UserContext) {
  channel.send({
    type: 'broadcast',
    event: 'context-change',
    payload: {
      tabId: currentTabId,
      context: newContext,
      timestamp: new Date().toISOString(),
    },
  });
}
```

**Receive Pattern**:

```typescript
channel.on('broadcast', { event: 'context-change' }, ({ payload }) => {
  // Ignore events from current tab
  if (payload.tabId === currentTabId) return;

  // Update local context state
  setCurrentContext(payload.context);

  // Update AI modal header (show current screen)
  setContextHeader(payload.context.screen);
});
```

**Payload Schema**:

```typescript
interface ContextUpdatePayload {
  tabId: string;
  context: UserContext;
  timestamp: string; // ISO 8601
}

interface UserContext {
  screen: string; // "inventory", "loadout-detail", etc.
  locale: 'en' | 'de';
  inventoryCount: number;
  currentLoadoutId?: string;
}
```

**Expected Latency**: P95 < 30ms

---

### Event: Rate Limit Notification

**Purpose**: Notify all tabs when user hits rate limit

**Send Pattern** (in Server Action):

```typescript
// After incrementing rate limit
if (rateLimitStatus.exceeded) {
  // Broadcast to all user's tabs
  const channel = supabase.channel(`rate-limit:${user.id}`);
  await channel.send({
    type: 'broadcast',
    event: 'rate-limit-exceeded',
    payload: {
      remaining: 0,
      resetsAt: rateLimitStatus.resets_at,
      timestamp: new Date().toISOString(),
    },
  });
}
```

**Receive Pattern**:

```typescript
const rateLimitChannel = supabase.channel(`rate-limit:${userId}`);

rateLimitChannel.on('broadcast', { event: 'rate-limit-exceeded' }, ({ payload }) => {
  // Disable chat input
  setIsRateLimited(true);
  setRateLimitResetsAt(new Date(payload.resetsAt));

  // Show toast notification
  toast.error(
    `Message limit reached (30/hour). Resets at ${formatTime(payload.resetsAt)}`
  );
});
```

**Payload Schema**:

```typescript
interface RateLimitPayload {
  remaining: number; // Messages remaining (always 0 for exceeded event)
  resetsAt: string; // ISO 8601 timestamp
  timestamp: string; // ISO 8601
}
```

**Expected Latency**: P95 < 30ms

---

## Connection Management

### Subscription Setup (in `useConversationSync` hook)

```typescript
function useConversationSync(conversationId: string) {
  const supabase = createClient();
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  useEffect(() => {
    // Create channel with unique name
    const channel = supabase.channel(`conversation:${conversationId}`, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    });

    // Subscribe to Postgres Changes
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, handleNewMessage)
      .on('broadcast', { event: 'typing' }, handleTypingIndicator)
      .on('broadcast', { event: 'context-change' }, handleContextUpdate)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          reconnectWithBackoff();
        }
      });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  return { connectionStatus };
}
```

### Reconnection Strategy

**Pattern**: Exponential backoff with max 5 attempts

```typescript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function reconnectWithBackoff() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    toast.error('Unable to connect to chat server. Please refresh the page.');
    return;
  }

  const delay = 1000 * Math.pow(2, reconnectAttempts); // 1s, 2s, 4s, 8s, 16s
  reconnectAttempts++;

  setTimeout(() => {
    console.log(`[Realtime] Reconnect attempt ${reconnectAttempts}`);
    subscribeToChannel();
  }, delay);
}

// Reset attempts on successful connection
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    reconnectAttempts = 0;
  }
});
```

### Online/Offline Handling

```typescript
// Reconnect when browser comes online
window.addEventListener('online', () => {
  console.log('[Realtime] Browser online, reconnecting...');
  reconnectAttempts = 0;
  subscribeToChannel();
});

window.addEventListener('offline', () => {
  console.log('[Realtime] Browser offline');
  setConnectionStatus('disconnected');
});
```

---

## Channel Naming Conventions

| Channel Name | Purpose | Subscribers |
|--------------|---------|-------------|
| `conversation:{conversationId}` | Message sync, typing, context | All tabs viewing same conversation |
| `rate-limit:{userId}` | Rate limit notifications | All tabs for same user |
| `user:{userId}` | Global user events (future) | All tabs for same user |

---

## Performance Optimization

### 1. Throttle High-Frequency Events

**Typing Indicator** - 300ms throttle:
```typescript
import { throttle } from 'lodash';

const sendTypingIndicator = throttle((isTyping: boolean) => {
  channel.send({ type: 'broadcast', event: 'typing', payload: { isTyping } });
}, 300);
```

### 2. Optimized RLS Policies

**Simple indexed policies** (avoid complex joins):
```sql
-- Messages table RLS
CREATE POLICY "users_view_own_messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
```

### 3. Presence Tracking (Optional)

**Track active tabs** (for future features):
```typescript
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  const activeTabCount = Object.keys(state).length;
  setActiveTabs(activeTabCount);
});

// Track current tab
channel.track({
  user_id: userId,
  tab_id: currentTabId,
  online_at: new Date().toISOString(),
});
```

---

## Error Handling

### Connection Errors

```typescript
channel.subscribe((status, error) => {
  switch (status) {
    case 'SUBSCRIBED':
      console.log('[Realtime] Connected');
      break;

    case 'CHANNEL_ERROR':
      console.error('[Realtime] Channel error:', error);
      setConnectionStatus('disconnected');
      reconnectWithBackoff();
      break;

    case 'TIMED_OUT':
      console.error('[Realtime] Connection timed out');
      setConnectionStatus('disconnected');
      reconnectWithBackoff();
      break;

    case 'CLOSED':
      console.log('[Realtime] Connection closed');
      setConnectionStatus('disconnected');
      break;
  }
});
```

### Payload Validation

**Validate all incoming payloads with Zod**:

```typescript
const TypingIndicatorPayloadSchema = z.object({
  userId: z.string().uuid(),
  tabId: z.string().uuid(),
  isTyping: z.boolean(),
  timestamp: z.string().datetime(),
});

channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
  try {
    const validatedPayload = TypingIndicatorPayloadSchema.parse(payload);
    handleTypingIndicator(validatedPayload);
  } catch (error) {
    console.error('[Realtime] Invalid typing payload:', error);
  }
});
```

---

## Security Considerations

1. **Channel Isolation**: User can only subscribe to channels for their own conversations (enforced by RLS)
2. **Broadcast Filtering**: Always check `tabId` to ignore self-broadcasts
3. **Payload Validation**: All payloads validated with Zod before processing
4. **No Sensitive Data**: Broadcast events contain minimal data (IDs, timestamps only)
5. **RLS Enforcement**: Postgres Changes filtered by `user_id` via RLS policies

---

## Monitoring

### OpenTelemetry Metrics

```typescript
// Sync latency (Postgres Changes)
recordHistogram('sync.message.latency', syncLatency, {
  event_type: 'postgres_changes',
});

// Broadcast latency
recordHistogram('sync.broadcast.latency', broadcastLatency, {
  event_type: 'typing',
});

// Connection status
recordGauge('sync.connection.status', connectionStatus === 'connected' ? 1 : 0);

// Reconnection attempts
recordCounter('sync.reconnect.attempts', 1);
```

### Alerting Rules

**Critical (P0)**:
- Sync P95 latency > 2s for 5 minutes → PagerDuty

**Warning (P1)**:
- Reconnection rate > 10/min → Slack #alerts
- Connection failure rate > 5% → Slack #alerts

---

## Testing Strategy

**Unit Tests**:
- Mock Supabase Realtime client
- Test throttling logic for typing indicator
- Test reconnection backoff algorithm

**Integration Tests**:
- Full Postgres Changes flow with local Supabase instance
- Broadcast event delivery between two mock clients
- RLS policy enforcement

**E2E Tests** (Playwright):
- Open two browser tabs
- Send message in Tab 1 → verify appears in Tab 2 within 2s
- Type in Tab 1 → verify typing indicator in Tab 2
- Navigate screen in Tab 1 → verify context update in Tab 2

---

**Generated**: 2025-12-16 | **Status**: Ready for implementation
