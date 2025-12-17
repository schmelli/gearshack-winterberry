# AI SDK Integration Tasks (Phase 5 Remaining)

## T058: Integrate Vercel AI SDK Tools in sendAIMessage

**Location:** `app/[locale]/ai-assistant/actions.ts`

**Goal:** Enable AI to call tools/functions during response generation

**Implementation Steps:**
1. Import `tool` from Vercel AI SDK
2. Define tool schemas for each action type:
   ```typescript
   const tools = {
     addToWishlist: tool({
       description: 'Add a gear item to the wishlist',
       parameters: z.object({
         gearItemId: z.string(),
       }),
     }),
     compareGear: tool({
       description: 'Compare multiple gear items',
       parameters: z.object({
         gearItemIds: z.array(z.string()).min(2).max(4),
       }),
     }),
     // ... other tools
   };
   ```
3. Pass tools to `generateText()` call
4. Handle tool results and append to message actions array

## T059: Update response-parser.ts to Extract Actions

**Location:** `lib/ai-assistant/response-parser.ts`

**Goal:** Parse AI tool calls into Action objects for UI rendering

**Implementation Steps:**
1. Check if AI response includes tool calls
2. Map tool calls to Action type format:
   ```typescript
   function extractActions(toolCalls: ToolCall[]): Action[] {
     return toolCalls.map(call => {
       if (call.toolName === 'addToWishlist') {
         return {
           type: 'add_to_wishlist',
           gearItemId: call.args.gearItemId,
           status: 'pending',
           error: null,
         };
       }
       // ... other tool types
     });
   }
   ```
3. Save actions to message.actions JSONB field

## T061: Action Status Tracking with Optimistic Updates

**Location:** `hooks/ai-assistant/useChatActions.ts`

**Goal:** Update action status in real-time with rollback on errors

**Implementation Steps:**
1. Add state management for action statuses
2. Implement optimistic update pattern:
   ```typescript
   const [actionStatuses, setActionStatuses] = useState<Map<string, ActionStatus>>();

   // Before executing
   setActionStatuses(prev => new Map(prev).set(actionId, 'pending'));

   // On success
   setActionStatuses(prev => new Map(prev).set(actionId, 'completed'));

   // On error (rollback)
   setActionStatuses(prev => new Map(prev).set(actionId, 'failed'));
   ```
3. Update MessageBubble to show live status changes
4. Persist status updates to database

## Dependencies

These tasks require:
- Vercel AI SDK with tool/function calling support
- Zod schemas for parameter validation
- Database updates to ai_messages table (actions JSONB column)

## Testing

Once implemented, test with:
- "Add this tent to my wishlist"
- "Compare these three sleeping bags"
- "Send a message to @username about this backpack"
