# Quickstart: User Messaging System

**Feature**: 046-user-messaging-system
**Date**: 2025-12-12

## Prerequisites

- Node.js 18+
- Access to Supabase project (credentials in `.env.local`)
- Cloudinary account (existing setup)

## Setup Steps

### 1. Apply Database Migration

Run the SQL migration to create messaging tables:

```bash
# Using Supabase CLI
supabase db push

# Or manually apply migration in Supabase Dashboard
# Navigate to SQL Editor and run the contents of:
# supabase/migrations/046_user_messaging.sql
```

### 2. Verify Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

### 3. Install Dependencies

No new dependencies required - all existing packages support this feature:
- `@supabase/supabase-js` (realtime, database)
- `next-cloudinary` (media upload)
- `zustand` (state management)
- `react-hook-form` + `zod` (form validation)

### 4. Development Workflow

```bash
# Start development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

## File Structure to Create

```
components/messaging/
├── MessagingModal.tsx        # Main modal container
├── ConversationList.tsx      # Sidebar with conversation list
├── ConversationView.tsx      # Message thread display
├── MessageBubble.tsx         # Single message component
├── MessageInput.tsx          # Compose area
├── FriendsList.tsx           # Friends quick-access
├── UserSearch.tsx            # User discovery
└── index.ts                  # Barrel export

hooks/messaging/
├── useConversations.ts       # Conversation CRUD + realtime
├── useMessages.ts            # Message CRUD + realtime
├── useFriends.ts             # Friends management
├── usePrivacySettings.ts     # Privacy preferences
├── useUnreadCount.ts         # Badge counter
└── index.ts                  # Barrel export

types/
└── messaging.ts              # All messaging types

lib/validations/
└── messaging-schema.ts       # Zod schemas
```

## Quick Implementation Guide

### Step 1: Create Types

```typescript
// types/messaging.ts
export type MessageType = 'text' | 'image' | 'voice' | 'location' | 'gear_reference' | 'gear_trade' | 'trip_invitation';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  created_at: string;
}
```

### Step 2: Create Core Hook

```typescript
// hooks/messaging/useConversations.ts
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Load conversations
    const load = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('conversation:conversations(*)')
        .eq('user_id', userId)
        .order('conversation(updated_at)', { ascending: false });

      setConversations(data?.map(d => d.conversation) ?? []);
    };
    load();

    // Subscribe to updates
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, load)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [userId]);

  return { conversations };
}
```

### Step 3: Create UI Component

```typescript
// components/messaging/MessagingModal.tsx
'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useConversations } from '@/hooks/messaging/useConversations';

interface MessagingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function MessagingModal({ open, onOpenChange, userId }: MessagingModalProps) {
  const { conversations } = useConversations(userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        {/* Conversation list + message view */}
      </DialogContent>
    </Dialog>
  );
}
```

### Step 4: Add to Header

```typescript
// components/layout/Header.tsx (modify existing)
import { Mail } from 'lucide-react';
import { useUnreadCount } from '@/hooks/messaging/useUnreadCount';

// In component:
const { unreadCount } = useUnreadCount();

// In render:
<Button variant="ghost" onClick={() => setMessagingOpen(true)}>
  <Mail className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</Button>
```

## Testing Checklist

- [ ] Can create direct conversation between two users
- [ ] Messages appear in real-time without refresh
- [ ] Unread count updates when receiving messages
- [ ] Can add/remove friends
- [ ] Privacy settings are respected
- [ ] Can block/unblock users
- [ ] Group chats work with multiple participants
- [ ] Message search returns relevant results
- [ ] Image upload works via Cloudinary
- [ ] Typing indicators show in real-time

## Common Issues

### Realtime not working
- Verify RLS policies allow SELECT on the table
- Check that the realtime replica is enabled for the table in Supabase Dashboard

### Messages not appearing
- Check RLS policies for message_deletions table
- Verify user is a participant in the conversation

### Privacy settings not enforced
- Ensure the `check_can_message` function is called before creating conversations
- Verify friend relationships are queried correctly

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Start with P1 user story (Send Direct Message)
3. Build incrementally, testing each component
4. Add P2-P5 features progressively
