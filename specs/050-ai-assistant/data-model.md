# Data Model: GearShack AI Assistant

**Feature**: 050-ai-assistant | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)

## Overview

This document defines the data entities, fields, relationships, and validation rules for the GearShack AI Assistant feature. All entities follow TypeScript strict mode conventions and align with the Feature-Sliced Light architecture pattern.

## Core Entities

### 1. Conversation

Represents a chat conversation thread between a user and the AI assistant.

**Database Table**: `conversations`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique conversation identifier |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the conversation |
| title | text | NULL | Auto-generated summary of first message (e.g., "Lightweight tent recommendations") |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Conversation creation timestamp |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Last message timestamp (for sorting) |
| message_count | integer | NOT NULL, DEFAULT 0 | Total messages in conversation (for cleanup) |
| context_snapshot | jsonb | NULL | Last known user context (screen, locale, inventory count) |

**TypeScript Interface**:
```typescript
interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  contextSnapshot: ContextSnapshot | null;
}

interface ContextSnapshot {
  screen: string; // e.g., "inventory", "loadout-detail"
  locale: string; // e.g., "en", "de"
  inventoryCount: number;
  currentLoadoutId?: string;
}
```

**Validation Rules**:
- `user_id` must reference valid user in auth.users
- `message_count` must be >= 0
- `updated_at` must be >= `created_at`
- Auto-delete conversations older than 90 days (pg_cron job)

**Indexes**:
```sql
CREATE INDEX conversations_user_id_updated_at_idx
  ON conversations(user_id, updated_at DESC);
```

---

### 2. Message

Represents a single message in a conversation (user or AI).

**Database Table**: `messages`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique message identifier |
| conversation_id | uuid | NOT NULL, REFERENCES conversations(id) ON DELETE CASCADE | Parent conversation |
| role | text | NOT NULL, CHECK (role IN ('user', 'assistant')) | Message author |
| content | text | NOT NULL | Message text content |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Message timestamp |
| inline_cards | jsonb | NULL | Array of InlineCard objects (gear previews, community offers) |
| actions | jsonb | NULL | Array of Action objects (executed system actions) |
| context | jsonb | NULL | User context at time of message (screen, locale, inventory snapshot) |
| tokens_used | integer | NULL | Token count (for AI messages only, observability) |

**TypeScript Interface**:
```typescript
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  inlineCards: InlineCard[] | null;
  actions: Action[] | null;
  context: MessageContext | null;
  tokensUsed: number | null;
}

interface MessageContext {
  screen: string;
  locale: string;
  inventoryCount: number;
  currentLoadoutId?: string;
  timestamp: string; // ISO 8601
}
```

**Validation Rules**:
- `conversation_id` must reference valid conversation
- `content` must not be empty (trim whitespace before validation)
- `role` must be 'user' or 'assistant'
- `tokens_used` must be NULL for user messages, > 0 for assistant messages
- `inline_cards` and `actions` must be valid JSON arrays (validated via Zod schemas)

**Indexes**:
```sql
CREATE INDEX messages_conversation_id_created_at_idx
  ON messages(conversation_id, created_at DESC);
```

---

### 3. InlineCard

Embedded within AI messages to display rich content previews.

**Not a database table** - stored as JSONB within `messages.inline_cards` array.

**TypeScript Interface**:
```typescript
type InlineCard = GearAlternativeCard | CommunityOfferCard;

interface GearAlternativeCard {
  type: 'gear_alternative';
  gearItemId: string; // References gear_items table
  name: string;
  brand: string;
  weight: number; // grams
  price: number | null; // USD
  imageUrl: string | null; // Cloudinary URL
  reason: string; // AI explanation (e.g., "20% lighter than your current tent")
}

interface CommunityOfferCard {
  type: 'community_offer';
  offerId: string; // References community_posts table
  userName: string;
  userAvatarUrl: string | null;
  itemName: string;
  price: number | null; // USD
  location: string; // City, State/Country
  imageUrl: string | null;
  distance: number | null; // kilometers (if user location available)
}
```

**Validation Rules (Zod Schema)**:
```typescript
const GearAlternativeCardSchema = z.object({
  type: z.literal('gear_alternative'),
  gearItemId: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string().min(1),
  weight: z.number().positive(),
  price: z.number().positive().nullable(),
  imageUrl: z.string().url().nullable(),
  reason: z.string().min(10).max(200),
});

const CommunityOfferCardSchema = z.object({
  type: z.literal('community_offer'),
  offerId: z.string().uuid(),
  userName: z.string().min(1),
  userAvatarUrl: z.string().url().nullable(),
  itemName: z.string().min(1),
  price: z.number().positive().nullable(),
  location: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  distance: z.number().positive().nullable(),
});

const InlineCardSchema = z.discriminatedUnion('type', [
  GearAlternativeCardSchema,
  CommunityOfferCardSchema,
]);
```

---

### 4. Action

System actions executed by the AI on behalf of the user.

**Not a database table** - stored as JSONB within `messages.actions` array.

**TypeScript Interface**:
```typescript
type Action =
  | AddToWishlistAction
  | SendMessageAction
  | CompareAction
  | NavigateAction;

interface AddToWishlistAction {
  type: 'add_to_wishlist';
  gearItemId: string;
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

interface SendMessageAction {
  type: 'send_message';
  recipientUserId: string;
  messagePreview: string; // First 50 chars
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

interface CompareAction {
  type: 'compare';
  gearItemIds: string[]; // 2-4 items
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

interface NavigateAction {
  type: 'navigate';
  destination: string; // e.g., "/inventory", "/loadouts/abc123"
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}
```

**Validation Rules (Zod Schema)**:
```typescript
const ActionStatusSchema = z.enum(['pending', 'completed', 'failed']);

const AddToWishlistActionSchema = z.object({
  type: z.literal('add_to_wishlist'),
  gearItemId: z.string().uuid(),
  status: ActionStatusSchema,
  error: z.string().nullable(),
});

const SendMessageActionSchema = z.object({
  type: z.literal('send_message'),
  recipientUserId: z.string().uuid(),
  messagePreview: z.string().max(50),
  status: ActionStatusSchema,
  error: z.string().nullable(),
});

const CompareActionSchema = z.object({
  type: z.literal('compare'),
  gearItemIds: z.array(z.string().uuid()).min(2).max(4),
  status: ActionStatusSchema,
  error: z.string().nullable(),
});

const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  destination: z.string().regex(/^\/[a-z0-9\-\/]*$/),
  status: ActionStatusSchema,
  error: z.string().nullable(),
});

const ActionSchema = z.discriminatedUnion('type', [
  AddToWishlistActionSchema,
  SendMessageActionSchema,
  CompareActionSchema,
  NavigateActionSchema,
]);
```

---

### 5. RateLimit

Tracks user message rate limiting (30 messages per hour).

**Database Table**: `rate_limits`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| user_id | uuid | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User being rate-limited |
| endpoint | text | NOT NULL, DEFAULT '/api/chat' | Rate limit scope (future-proofing) |
| count | integer | NOT NULL, DEFAULT 0 | Messages sent in current window |
| window_start | timestamptz | NOT NULL, DEFAULT now() | Start of 1-hour rolling window |
| last_message_at | timestamptz | NULL | Timestamp of most recent message |

**TypeScript Interface**:
```typescript
interface RateLimit {
  userId: string;
  endpoint: string;
  count: number;
  windowStart: Date;
  lastMessageAt: Date | null;
}

interface RateLimitStatus {
  remaining: number; // messages remaining in current hour
  resetsAt: Date; // when window resets
  isLimited: boolean; // true if count >= 30
}
```

**Validation Rules**:
- `count` must be >= 0
- `window_start` must be <= now()
- Auto-reset `count` to 0 when `window_start` + 1 hour < now()

**Supabase Function** (for atomic rate limit checks):
```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_hours integer
) RETURNS jsonb AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
  v_exceeded boolean;
  v_resets_at timestamptz;
BEGIN
  -- Get or create rate limit record
  INSERT INTO rate_limits (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 0, now())
  ON CONFLICT (user_id, endpoint) DO NOTHING;

  -- Get current state
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  -- Reset window if expired
  IF v_window_start + (p_window_hours || ' hours')::interval < now() THEN
    UPDATE rate_limits
    SET count = 0, window_start = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    v_count := 0;
    v_window_start := now();
  END IF;

  v_exceeded := v_count >= p_limit;
  v_resets_at := v_window_start + (p_window_hours || ' hours')::interval;

  RETURN jsonb_build_object(
    'exceeded', v_exceeded,
    'count', v_count,
    'limit', p_limit,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Indexes**:
```sql
CREATE INDEX rate_limits_user_id_endpoint_idx
  ON rate_limits(user_id, endpoint);
```

---

### 6. CachedResponse

Fallback responses for common queries when AI backend is unavailable.

**Database Table**: `cached_responses`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique cache entry identifier |
| query_pattern | text | NOT NULL, UNIQUE | Normalized query (lowercase, stemmed) |
| response_en | text | NOT NULL | Cached response in English |
| response_de | text | NOT NULL | Cached response in German |
| usage_count | integer | NOT NULL, DEFAULT 0 | Times this cache was used (analytics) |
| last_used_at | timestamptz | NULL | Last cache hit timestamp |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Cache entry creation |

**TypeScript Interface**:
```typescript
interface CachedResponse {
  id: string;
  queryPattern: string;
  responseEn: string;
  responseDe: string;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}
```

**Validation Rules**:
- `query_pattern` must be unique
- `response_en` and `response_de` must not be empty
- `usage_count` must be >= 0

**Seed Data** (common queries):
```sql
INSERT INTO cached_responses (query_pattern, response_en, response_de) VALUES
('what is base weight',
 'Base weight is the total weight of your gear excluding consumables (food, water, fuel). It''s a key metric for evaluating how "ultralight" your loadout is.',
 'Basisgewicht ist das Gesamtgewicht Ihrer Ausrüstung ohne Verbrauchsmaterialien (Essen, Wasser, Brennstoff). Es ist eine wichtige Kennzahl zur Bewertung, wie "ultraleicht" Ihre Ausrüstung ist.'),

('how do i reduce pack weight',
 'Top strategies: 1) Replace your heaviest items (tent, backpack, sleeping bag) with lighter alternatives. 2) Eliminate duplicate items. 3) Choose multi-use gear. 4) Leave behind "just in case" items you rarely use.',
 'Top-Strategien: 1) Ersetzen Sie Ihre schwersten Gegenstände (Zelt, Rucksack, Schlafsack) durch leichtere Alternativen. 2) Eliminieren Sie doppelte Gegenstände. 3) Wählen Sie Mehrzweckausrüstung. 4) Lassen Sie "nur für den Fall"-Gegenstände weg, die Sie selten verwenden.'),

('what is r-value',
 'R-value measures a sleeping pad''s insulation effectiveness. Higher R-values provide more warmth. For example: R-1 to R-2 (summer), R-2 to R-4 (3-season), R-4+ (winter). Your sleeping pad''s R-value should match the lowest temperature you expect.',
 'R-Wert misst die Isolierwirkung einer Isomatte. Höhere R-Werte bieten mehr Wärme. Zum Beispiel: R-1 bis R-2 (Sommer), R-2 bis R-4 (3-Jahreszeiten), R-4+ (Winter). Der R-Wert Ihrer Isomatte sollte zur niedrigsten erwarteten Temperatur passen.'),

('how to choose a sleeping bag',
 'Key factors: 1) Temperature rating (match to coldest expected conditions). 2) Insulation type (down for weight/packability, synthetic for wet conditions). 3) Shape (mummy for warmth, rectangular for comfort). 4) Weight and packed size for your trip length.',
 'Wichtige Faktoren: 1) Temperaturbereich (passend zu den kältesten erwarteten Bedingungen). 2) Isolationstyp (Daune für Gewicht/Packmaß, Synthetik für nasse Bedingungen). 3) Form (Mumie für Wärme, rechteckig für Komfort). 4) Gewicht und Packmaß für Ihre Tourlänge.'),

('what is lighterpack',
 'Lighterpack is a popular free website for creating and sharing gear lists. It automatically calculates total weight, base weight, and worn weight. Many backpackers use it to plan trips and compare loadouts with the community.',
 'Lighterpack ist eine beliebte kostenlose Website zum Erstellen und Teilen von Ausrüstungslisten. Es berechnet automatisch Gesamtgewicht, Basisgewicht und getragenes Gewicht. Viele Rucksacktouristen nutzen es zur Tourenplanung und zum Vergleich von Ausrüstungen mit der Community.'),

('ultralight backpacking tips',
 'Essential ultralight tips: 1) Cut your Big Three weight (tent, backpack, sleeping bag/quilt). 2) Use a digital scale to weigh everything. 3) Question every item: "Will I actually use this?" 4) Choose multi-use items. 5) Learn skills to replace gear (e.g., navigation instead of heavy guidebooks).',
 'Wesentliche Ultraleicht-Tipps: 1) Reduzieren Sie Ihr Big Three Gewicht (Zelt, Rucksack, Schlafsack/Quilt). 2) Verwenden Sie eine Digitalwaage zum Wiegen. 3) Hinterfragen Sie jeden Gegenstand: "Werde ich das wirklich benutzen?" 4) Wählen Sie Mehrzweck-Gegenstände. 5) Lernen Sie Fähigkeiten statt Ausrüstung mitzunehmen (z.B. Navigation statt schwerer Reiseführer).');
```

**Indexes**:
```sql
CREATE INDEX cached_responses_query_pattern_idx
  ON cached_responses USING gin(query_pattern gin_trgm_ops);
```

---

## Entity Relationships

```
┌──────────────┐       1:N       ┌──────────┐
│ Conversation │◄────────────────┤ Message  │
└──────────────┘                 └──────────┘
      │                                │
      │ 1:1                            │ 1:N
      │                                │
      ▼                                ▼
┌──────────────┐                 ┌─────────────┐
│ auth.users   │                 │ InlineCard  │ (JSONB)
└──────────────┘                 └─────────────┘
      │                                │
      │ 1:1                            │ 1:N
      │                                │
      ▼                                ▼
┌──────────────┐                 ┌─────────────┐
│ RateLimit    │                 │ Action      │ (JSONB)
└──────────────┘                 └─────────────┘
```

**Relationships**:
- **Conversation → Messages**: One conversation has many messages (1:N, CASCADE DELETE)
- **User → Conversations**: One user has many conversations (1:N, CASCADE DELETE)
- **User → RateLimit**: One user has one rate limit record (1:1, CASCADE DELETE)
- **Message → InlineCards**: One message has zero or more inline cards (1:N, embedded JSONB)
- **Message → Actions**: One message has zero or more actions (1:N, embedded JSONB)

---

## Supabase Row Level Security (RLS) Policies

**Conversations Table**:
```sql
-- Users can only view their own conversations
CREATE POLICY "users_view_own_conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert conversations for themselves
CREATE POLICY "users_insert_own_conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own conversations
CREATE POLICY "users_update_own_conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own conversations
CREATE POLICY "users_delete_own_conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);
```

**Messages Table**:
```sql
-- Users can only view messages in their conversations
CREATE POLICY "users_view_own_messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Users can only insert messages in their conversations
CREATE POLICY "users_insert_own_messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );
```

**Rate Limits Table**:
```sql
-- Users can only view their own rate limits
CREATE POLICY "users_view_own_rate_limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);
```

**Cached Responses Table**:
```sql
-- All authenticated users can read cached responses
CREATE POLICY "authenticated_read_cached_responses"
  ON cached_responses FOR SELECT
  TO authenticated
  USING (true);
```

---

## Database Migration Script

**File**: `supabase/migrations/050_ai_assistant.sql`

```sql
-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0,
  context_snapshot jsonb
);

CREATE INDEX conversations_user_id_updated_at_idx
  ON conversations(user_id, updated_at DESC);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  inline_cards jsonb,
  actions jsonb,
  context jsonb,
  tokens_used integer
);

CREATE INDEX messages_conversation_id_created_at_idx
  ON messages(conversation_id, created_at DESC);

-- Create rate_limits table
CREATE TABLE rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL DEFAULT '/api/chat',
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

CREATE INDEX rate_limits_user_id_endpoint_idx
  ON rate_limits(user_id, endpoint);

-- Create cached_responses table
CREATE TABLE cached_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_pattern text NOT NULL UNIQUE,
  response_en text NOT NULL,
  response_de text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cached_responses_query_pattern_idx
  ON cached_responses USING gin(query_pattern gin_trgm_ops);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (as defined above)
-- [Insert all RLS policies here]

-- Automatic cleanup job for 90-day retention
SELECT cron.schedule(
  'purge-old-conversations',
  '0 2 * * *', -- Daily at 2am UTC
  $$
  DELETE FROM conversations
  WHERE updated_at < now() - interval '90 days';
  $$
);

-- Seed cached responses
INSERT INTO cached_responses (query_pattern, response_en, response_de) VALUES
('what is base weight',
 'Base weight is the total weight of your gear excluding consumables (food, water, fuel). It''s a key metric for evaluating how "ultralight" your loadout is.',
 'Basisgewicht ist das Gesamtgewicht Ihrer Ausrüstung ohne Verbrauchsmaterialien (Essen, Wasser, Brennstoff). Es ist eine wichtige Kennzahl zur Bewertung, wie "ultraleicht" Ihre Ausrüstung ist.'),

('how do i reduce pack weight',
 'Top strategies: 1) Replace your heaviest items (tent, backpack, sleeping bag) with lighter alternatives. 2) Eliminate duplicate items. 3) Choose multi-use gear. 4) Leave behind "just in case" items you rarely use.',
 'Top-Strategien: 1) Ersetzen Sie Ihre schwersten Gegenstände (Zelt, Rucksack, Schlafsack) durch leichtere Alternativen. 2) Eliminieren Sie doppelte Gegenstände. 3) Wählen Sie Mehrzweckausrüstung. 4) Lassen Sie "nur für den Fall"-Gegenstände weg, die Sie selten verwenden.'),

('what is r-value',
 'R-value measures a sleeping pad''s insulation effectiveness. Higher R-values provide more warmth. For example: R-1 to R-2 (summer), R-2 to R-4 (3-season), R-4+ (winter). Your sleeping pad''s R-value should match the lowest temperature you expect.',
 'R-Wert misst die Isolierwirkung einer Isomatte. Höhere R-Werte bieten mehr Wärme. Zum Beispiel: R-1 bis R-2 (Sommer), R-2 bis R-4 (3-Jahreszeiten), R-4+ (Winter). Der R-Wert Ihrer Isomatte sollte zur niedrigsten erwarteten Temperatur passen.'),

('how to choose a sleeping bag',
 'Key factors: 1) Temperature rating (match to coldest expected conditions). 2) Insulation type (down for weight/packability, synthetic for wet conditions). 3) Shape (mummy for warmth, rectangular for comfort). 4) Weight and packed size for your trip length.',
 'Wichtige Faktoren: 1) Temperaturbereich (passend zu den kältesten erwarteten Bedingungen). 2) Isolationstyp (Daune für Gewicht/Packmaß, Synthetik für nasse Bedingungen). 3) Form (Mumie für Wärme, rechteckig für Komfort). 4) Gewicht und Packmaß für Ihre Tourlänge.'),

('what is lighterpack',
 'Lighterpack is a popular free website for creating and sharing gear lists. It automatically calculates total weight, base weight, and worn weight. Many backpackers use it to plan trips and compare loadouts with the community.',
 'Lighterpack ist eine beliebte kostenlose Website zum Erstellen und Teilen von Ausrüstungslisten. Es berechnet automatisch Gesamtgewicht, Basisgewicht und getragenes Gewicht. Viele Rucksacktouristen nutzen es zur Tourenplanung und zum Vergleich von Ausrüstungen mit der Community.'),

('ultralight backpacking tips',
 'Essential ultralight tips: 1) Cut your Big Three weight (tent, backpack, sleeping bag/quilt). 2) Use a digital scale to weigh everything. 3) Question every item: "Will I actually use this?" 4) Choose multi-use items. 5) Learn skills to replace gear (e.g., navigation instead of heavy guidebooks).',
 'Wesentliche Ultraleicht-Tipps: 1) Reduzieren Sie Ihr Big Three Gewicht (Zelt, Rucksack, Schlafsack/Quilt). 2) Verwenden Sie eine Digitalwaage zum Wiegen. 3) Hinterfragen Sie jeden Gegenstand: "Werde ich das wirklich benutzen?" 4) Wählen Sie Mehrzweck-Gegenstände. 5) Lernen Sie Fähigkeiten statt Ausrüstung mitzunehmen (z.B. Navigation statt schwerer Reiseführer).');
```

---

## Type Generation

**Supabase CLI Command**:
```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

**Usage in Application**:
```typescript
import type { Database } from '@/types/supabase';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type RateLimit = Database['public']['Tables']['rate_limits']['Row'];
type CachedResponse = Database['public']['Tables']['cached_responses']['Row'];
```

---

## Validation Summary

All entities follow these principles:
- **TypeScript Strict Mode**: No `any` types, explicit nullable fields
- **Zod Validation**: All JSONB fields validated with discriminated unions
- **RLS Policies**: Enforce user isolation, prevent data leakage
- **Indexes**: Optimized for query patterns (user_id + timestamp sorts, trigram search)
- **Cascading Deletes**: Automatic cleanup when users or conversations are deleted
- **90-Day Retention**: Automated pg_cron job for conversation purging

**Generated**: 2025-12-16 | **Status**: Ready for implementation
