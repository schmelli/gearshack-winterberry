# API Contract: AI Actions

**Feature**: 050-ai-assistant | **Contract Type**: Server Actions | **Date**: 2025-12-16

## Overview

Server Actions that execute system operations on behalf of the user based on AI recommendations. These actions are triggered by the AI assistant using the Vercel AI SDK's tool execution pattern.

## Actions

1. **addToWishlist** - Add gear item to user's wishlist
2. **sendMessage** - Send message to community member
3. **compareGear** - Navigate to gear comparison view
4. **navigateToScreen** - Navigate user to specific app screen

---

## 1. Add to Wishlist

### Tool Definition

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const addToWishlistTool = tool({
  description: 'Add a gear item to the user\'s wishlist',
  parameters: z.object({
    gearItemId: z.string().uuid().describe('UUID of the gear item to add'),
    source: z.enum(['catalog', 'community']).describe('Where the item was found'),
  }),
  execute: async ({ gearItemId, source }) => {
    // Implementation below
  },
});
```

### Server Action Implementation

**File**: `app/[locale]/ai-assistant/actions.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AddToWishlistInputSchema = z.object({
  gearItemId: z.string().uuid(),
  source: z.enum(['catalog', 'community']),
});

export async function addToWishlist(input: unknown) {
  // 1. Validate input
  const { gearItemId, source } = AddToWishlistInputSchema.parse(input);

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('UNAUTHENTICATED');
  }

  // 3. Check if item exists
  const { data: gearItem, error: gearError } = await supabase
    .from('gear_items')
    .select('id, name, brand')
    .eq('id', gearItemId)
    .single();

  if (gearError || !gearItem) {
    throw new Error('GEAR_ITEM_NOT_FOUND');
  }

  // 4. Insert wishlist entry (or update if exists)
  const { error: insertError } = await supabase
    .from('gear_items')
    .update({ status: 'wishlist' })
    .eq('id', gearItemId)
    .eq('user_id', user.id);

  if (insertError) {
    throw new Error('WISHLIST_ADD_FAILED');
  }

  // 5. Return success response
  return {
    success: true,
    itemName: `${gearItem.brand} ${gearItem.name}`,
    message: `Added ${gearItem.brand} ${gearItem.name} to your wishlist`,
  };
}
```

### Response Contract

**Success Response**:
```typescript
interface AddToWishlistResponse {
  success: true;
  itemName: string; // "Zpacks Duplex"
  message: string; // Confirmation message for AI to relay
}
```

**Error Codes**:
- `UNAUTHENTICATED` - User not logged in
- `GEAR_ITEM_NOT_FOUND` - Invalid gear item ID
- `WISHLIST_ADD_FAILED` - Database error

---

## 2. Send Message

### Tool Definition

```typescript
const sendMessageTool = tool({
  description: 'Send a message to a community member about a gear item or offer',
  parameters: z.object({
    recipientUserId: z.string().uuid().describe('UUID of the recipient user'),
    messageText: z.string().min(1).max(500).describe('Message content'),
    relatedGearItemId: z.string().uuid().optional().describe('Optional gear item reference'),
  }),
  execute: async ({ recipientUserId, messageText, relatedGearItemId }) => {
    // Implementation below
  },
});
```

### Server Action Implementation

```typescript
'use server';

const SendMessageInputSchema = z.object({
  recipientUserId: z.string().uuid(),
  messageText: z.string().min(1).max(500),
  relatedGearItemId: z.string().uuid().optional(),
});

export async function sendCommunityMessage(input: unknown) {
  // 1. Validate input
  const { recipientUserId, messageText, relatedGearItemId } =
    SendMessageInputSchema.parse(input);

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('UNAUTHENTICATED');
  }

  // 3. Check recipient exists and is not blocked
  const { data: recipient, error: recipientError } = await supabase
    .from('user_profiles')
    .select('id, username')
    .eq('id', recipientUserId)
    .single();

  if (recipientError || !recipient) {
    throw new Error('RECIPIENT_NOT_FOUND');
  }

  // 4. Check for existing conversation or create new one
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .or(`participant_1.eq.${recipientUserId},participant_2.eq.${recipientUserId}`)
    .single();

  let conversationId: string;

  if (!conversation) {
    // Create new conversation
    const { data: newConversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        participant_1: user.id,
        participant_2: recipientUserId,
      })
      .select('id')
      .single();

    if (convError || !newConversation) {
      throw new Error('CONVERSATION_CREATE_FAILED');
    }

    conversationId = newConversation.id;
  } else {
    conversationId = conversation.id;
  }

  // 5. Send message
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageText,
      related_gear_item_id: relatedGearItemId || null,
    });

  if (messageError) {
    throw new Error('MESSAGE_SEND_FAILED');
  }

  // 6. Return success response
  return {
    success: true,
    recipientName: recipient.username,
    conversationId,
    message: `Message sent to ${recipient.username}`,
  };
}
```

### Response Contract

**Success Response**:
```typescript
interface SendMessageResponse {
  success: true;
  recipientName: string; // "john_hiker"
  conversationId: string; // UUID
  message: string; // Confirmation message
}
```

**Error Codes**:
- `UNAUTHENTICATED` - User not logged in
- `RECIPIENT_NOT_FOUND` - Invalid recipient user ID
- `CONVERSATION_CREATE_FAILED` - Failed to create conversation
- `MESSAGE_SEND_FAILED` - Failed to insert message

---

## 3. Compare Gear

### Tool Definition

```typescript
const compareGearTool = tool({
  description: 'Navigate to gear comparison view with selected items',
  parameters: z.object({
    gearItemIds: z.array(z.string().uuid()).min(2).max(4).describe('2-4 gear items to compare'),
  }),
  execute: async ({ gearItemIds }) => {
    // Implementation below
  },
});
```

### Server Action Implementation

```typescript
'use server';

const CompareGearInputSchema = z.object({
  gearItemIds: z.array(z.string().uuid()).min(2).max(4),
});

export async function compareGear(input: unknown) {
  // 1. Validate input
  const { gearItemIds } = CompareGearInputSchema.parse(input);

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('UNAUTHENTICATED');
  }

  // 3. Verify all gear items exist
  const { data: gearItems, error: gearError } = await supabase
    .from('gear_items')
    .select('id, name, brand')
    .in('id', gearItemIds);

  if (gearError || gearItems.length !== gearItemIds.length) {
    throw new Error('GEAR_ITEMS_NOT_FOUND');
  }

  // 4. Return comparison URL
  const compareUrl = `/compare?items=${gearItemIds.join(',')}`;

  return {
    success: true,
    compareUrl,
    itemCount: gearItemIds.length,
    message: `Comparing ${gearItemIds.length} items`,
  };
}
```

### Response Contract

**Success Response**:
```typescript
interface CompareGearResponse {
  success: true;
  compareUrl: string; // "/compare?items=uuid1,uuid2,uuid3"
  itemCount: number; // 2-4
  message: string; // Confirmation message
}
```

**Error Codes**:
- `UNAUTHENTICATED` - User not logged in
- `GEAR_ITEMS_NOT_FOUND` - One or more gear items do not exist
- `INVALID_ITEM_COUNT` - Must compare 2-4 items

---

## 4. Navigate to Screen

### Tool Definition

```typescript
const navigateToScreenTool = tool({
  description: 'Navigate the user to a specific screen in the app',
  parameters: z.object({
    destination: z.enum([
      'inventory',
      'wishlist',
      'loadouts',
      'community',
      'profile',
    ]).describe('Target screen'),
    resourceId: z.string().uuid().optional().describe('Optional resource ID (e.g., loadout ID)'),
  }),
  execute: async ({ destination, resourceId }) => {
    // Implementation below
  },
});
```

### Server Action Implementation

```typescript
'use server';

const NavigateInputSchema = z.object({
  destination: z.enum(['inventory', 'wishlist', 'loadouts', 'community', 'profile']),
  resourceId: z.string().uuid().optional(),
});

export async function navigateToScreen(input: unknown) {
  // 1. Validate input
  const { destination, resourceId } = NavigateInputSchema.parse(input);

  // 2. Build navigation URL
  let navigationUrl: string;

  switch (destination) {
    case 'inventory':
      navigationUrl = '/inventory';
      break;
    case 'wishlist':
      navigationUrl = '/wishlist';
      break;
    case 'loadouts':
      navigationUrl = resourceId ? `/loadouts/${resourceId}` : '/loadouts';
      break;
    case 'community':
      navigationUrl = '/community';
      break;
    case 'profile':
      navigationUrl = '/profile';
      break;
  }

  // 3. Return navigation URL (client will handle redirect)
  return {
    success: true,
    navigationUrl,
    message: `Navigating to ${destination}`,
  };
}
```

### Response Contract

**Success Response**:
```typescript
interface NavigateResponse {
  success: true;
  navigationUrl: string; // "/inventory" or "/loadouts/uuid"
  message: string; // Confirmation message
}
```

**Error Codes**:
- `INVALID_DESTINATION` - Unknown destination

---

## Tool Integration in AI Query

**Integration Pattern** (in `sendAIMessage` Server Action):

```typescript
const result = streamText({
  model: anthropic('claude-sonnet-4.5'),
  system: systemPrompt,
  messages: conversationHistory,
  tools: {
    addToWishlist: addToWishlistTool,
    sendMessage: sendMessageTool,
    compareGear: compareGearTool,
    navigateToScreen: navigateToScreenTool,
  },
  onToolCall: async ({ toolCall }) => {
    // Log tool execution for observability
    console.log('[AI Tool Call]', toolCall.name, toolCall.parameters);

    // Track in OpenTelemetry
    span.addEvent('tool_call', {
      tool_name: toolCall.name,
      parameters: JSON.stringify(toolCall.parameters),
    });
  },
});
```

**Client-Side Action Handling** (in `useAIChat` hook):

```typescript
// When AI stream includes action
if (chunk.type === 'action') {
  const action = chunk.data as Action;

  // Update UI with action status
  setActions((prev) => [...prev, action]);

  // If action requires navigation
  if (action.type === 'navigate' && action.status === 'completed') {
    router.push(action.navigationUrl);
  }

  // Show toast notification
  if (action.status === 'completed') {
    toast.success(action.message);
  } else if (action.status === 'failed') {
    toast.error(action.error || 'Action failed');
  }
}
```

---

## Action Status Tracking

**Pattern**: Actions are stored in `messages.actions` JSONB array with status tracking

**Action Lifecycle**:
1. **pending** - AI calls tool, action initiated
2. **completed** - Server Action succeeds, result returned
3. **failed** - Server Action throws error, error message captured

**Example Message with Actions**:

```json
{
  "id": "msg-123",
  "conversation_id": "conv-456",
  "role": "assistant",
  "content": "I've added the Zpacks Duplex to your wishlist and sent a message to sarah_hiker about her tent offer.",
  "actions": [
    {
      "type": "add_to_wishlist",
      "gearItemId": "gear-789",
      "status": "completed",
      "error": null
    },
    {
      "type": "send_message",
      "recipientUserId": "user-101",
      "messagePreview": "Hi Sarah, I'm interested in your tent...",
      "status": "completed",
      "error": null
    }
  ]
}
```

---

## Error Handling

**Pattern**: All Server Actions throw errors with error codes (not HTTP errors)

**Client-Side Error Handling** (in `useChatActions` hook):

```typescript
async function executeAction(action: Action) {
  try {
    switch (action.type) {
      case 'add_to_wishlist':
        return await addToWishlist(action);
      case 'send_message':
        return await sendCommunityMessage(action);
      case 'compare':
        return await compareGear(action);
      case 'navigate':
        return await navigateToScreen(action);
    }
  } catch (error) {
    // Parse error code
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    // Map to user-friendly message
    const userMessage = errorCodeToMessage(errorCode, locale);

    // Show error toast
    toast.error(userMessage);

    // Update action status
    return {
      ...action,
      status: 'failed',
      error: userMessage,
    };
  }
}
```

---

## Security Considerations

1. **Authorization**: All actions verify `auth.uid()` matches resource owner
2. **Rate Limiting**: Actions count toward 30 msg/hr rate limit
3. **Input Validation**: All parameters validated with Zod schemas
4. **RLS Enforcement**: Database queries filtered by user ID
5. **No Client-Side Tool Execution**: Tools only called by AI backend, not directly by client

---

## Performance Monitoring

**OpenTelemetry Metrics**:
- `ai.tool.calls.total` - Counter (by tool name)
- `ai.tool.duration` - Histogram (P50/P95/P99 by tool)
- `ai.tool.errors.total` - Counter (by tool and error code)

**Tracing Pattern**:
```typescript
const span = tracer.startActiveSpan('ai_tool_call', {
  attributes: {
    'tool.name': toolCall.name,
    'tool.user_id': user.id,
  },
});

try {
  const result = await executeTool(toolCall);
  span.setStatus({ code: SpanStatusCode.OK });
  return result;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
} finally {
  span.end();
}
```

---

## Testing Strategy

**Unit Tests**:
- Each Server Action with mocked Supabase client
- Input validation edge cases (invalid UUIDs, out-of-range values)
- Error code handling

**Integration Tests**:
- Full tool call flow: AI → tool execution → database update
- Action status tracking in messages table
- Multi-action execution in single AI response

**E2E Tests** (Playwright):
- User asks AI to add item to wishlist → item appears in wishlist
- User asks AI to send message → message appears in conversations
- User asks AI to compare gear → navigates to comparison view

---

**Generated**: 2025-12-16 | **Status**: Ready for implementation
