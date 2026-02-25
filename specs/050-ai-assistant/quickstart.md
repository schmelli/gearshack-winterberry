# Quickstart: GearShack AI Assistant - Local Development

**Feature**: 050-ai-assistant | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)

## Overview

This guide walks you through setting up the AI Assistant feature for local development, including environment configuration, database migration, AI backend integration, and verification steps.

**Estimated Setup Time**: 20-30 minutes

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ npm or yarn installed
- ✅ Supabase project created (or local Supabase instance running)
- ✅ Vercel AI Gateway account (for AI model access)
- ✅ OpenTelemetry backend (optional - SigNoz or Prometheus + Grafana)

---

## Step 1: Install Dependencies

### New NPM Packages

```bash
# Vercel AI SDK (core conversational AI)
npm install ai @ai-sdk/anthropic

# OpenTelemetry (observability)
npm install @opentelemetry/sdk-node \
            @opentelemetry/api \
            @opentelemetry/instrumentation \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http \
            @opentelemetry/exporter-logs-otlp-http \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/instrumentation-pg

# Development dependencies
npm install -D @types/lodash
```

**Verification**:
```bash
npm list ai @opentelemetry/sdk-node
# Should show installed versions
```

---

## Step 2: Environment Variables

### Create or Update `.env.local`

```bash
# Vercel AI SDK Configuration
AI_GATEWAY_API_KEY=your_gateway_api_key_here
AI_CHAT_MODEL=anthropic/claude-sonnet-4.5
AI_CHAT_ENABLED=true

# OpenTelemetry Configuration (optional for MVP)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
OTEL_API_KEY=your-otel-api-key
OTEL_SERVICE_NAME=gearshack-winterberry
OTEL_SERVICE_VERSION=dev

# Supabase Configuration (existing)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Get Vercel AI Gateway API Key

1. Go to [Vercel AI Gateway](https://vercel.com/ai-gateway)
2. Create a new API key
3. Copy the key and paste into `.env.local`

**Note**: Vercel AI Gateway provides access to multiple AI models (Anthropic, OpenAI, etc.) through a single API key.

---

## Step 3: Database Migration

### Run Migration Script

```bash
# Navigate to Supabase migrations directory
cd supabase/migrations

# Create migration file
cat > 050_ai_assistant.sql << 'EOF'
-- [Paste full migration script from data-model.md]
EOF

# Apply migration (local Supabase)
npx supabase migration up

# Apply migration (remote Supabase)
npx supabase db push
```

**Migration File Location**: `supabase/migrations/050_ai_assistant.sql`

**Full Migration Script** (from [data-model.md](./data-model.md)):

<details>
<summary>Click to expand migration script</summary>

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

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX cached_responses_query_pattern_idx
  ON cached_responses USING gin(query_pattern gin_trgm_ops);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Conversations
CREATE POLICY "users_view_own_conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: Messages
CREATE POLICY "users_view_own_messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- RLS Policies: Rate Limits
CREATE POLICY "users_view_own_rate_limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies: Cached Responses
CREATE POLICY "authenticated_read_cached_responses"
  ON cached_responses FOR SELECT
  TO authenticated
  USING (true);

-- Rate Limit Functions
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
  INSERT INTO rate_limits (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 0, now())
  ON CONFLICT (user_id, endpoint) DO NOTHING;

  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

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

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id uuid,
  p_endpoint text
) RETURNS void AS $$
BEGIN
  UPDATE rate_limits
  SET count = count + 1,
      last_message_at = now()
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed cached responses
INSERT INTO cached_responses (query_pattern, response_en, response_de) VALUES
('what is base weight',
 'Base weight is the total weight of your gear excluding consumables (food, water, fuel). It''s a key metric for evaluating how "ultralight" your loadout is.',
 'Basisgewicht ist das Gesamtgewicht Ihrer Ausrüstung ohne Verbrauchsmaterialien (Essen, Wasser, Brennstoff). Es ist eine wichtige Kennzahl zur Bewertung, wie "ultraleicht" Ihre Ausrüstung ist.'),

('how do i reduce pack weight',
 'Top strategies: 1) Replace your heaviest items (tent, backpack, sleeping bag) with lighter alternatives. 2) Eliminate duplicate items. 3) Choose multi-use gear. 4) Leave behind "just in case" items you rarely use.',
 'Top-Strategien: 1) Ersetzen Sie Ihre schwersten Gegenstände (Zelt, Rucksack, Schlafsack) durch leichtere Alternativen. 2) Eliminieren Sie doppelte Gegenstände. 3) Wählen Sie Mehrzweckausrüstung. 4) Lassen Sie "nur für den Fall"-Gegenstände weg, die Sie selten verwenden.');

-- 90-Day Retention Job (requires pg_cron extension)
-- Note: Only enable if pg_cron is available
-- SELECT cron.schedule(
--   'purge-old-conversations',
--   '0 2 * * *',
--   $$
--   DELETE FROM conversations
--   WHERE updated_at < now() - interval '90 days';
--   $$
-- );
```

</details>

**Verification**:
```bash
# Check tables exist
npx supabase db diff

# Query conversations table
npx supabase db query "SELECT * FROM conversations LIMIT 1;"
```

---

## Step 4: Generate TypeScript Types

### Regenerate Supabase Types

```bash
# Generate types from database schema
npx supabase gen types typescript --local > types/supabase.ts

# Or for remote project
npx supabase gen types typescript --project-id <your-project-id> > types/supabase.ts
```

**Verification**:
```bash
# Check if new types exist
grep "conversations" types/supabase.ts
grep "messages" types/supabase.ts
```

---

## Step 5: Configure OpenTelemetry (Optional)

### Create Instrumentation File

**File**: `instrumentation.node.ts` (Next.js root directory)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'gearshack-winterberry',
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || 'dev',
  }),
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    })
  ),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    }),
    exportIntervalMillis: 30000, // Export every 30s
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

**Enable in `next.config.ts`**:

```typescript
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

**Note**: OpenTelemetry is optional for MVP development but recommended for production monitoring.

---

## Step 6: Update User Profile Schema

### Add Subscription Tier Field

**Migration** (if not already exists):

```sql
-- Add subscription_tier to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_tier text
  CHECK (subscription_tier IN ('standard', 'trailblazer'))
  DEFAULT 'standard';

-- Update existing test user to Trailblazer
UPDATE user_profiles
SET subscription_tier = 'trailblazer'
WHERE email = 'test@example.com'; -- Use your test user email
```

**Verification**:
```bash
npx supabase db query "SELECT email, subscription_tier FROM user_profiles LIMIT 5;"
```

---

## Step 7: Create Test Data

### Seed a Test Conversation

```sql
-- Create test conversation (replace <your-user-id>)
INSERT INTO conversations (user_id, title, context_snapshot)
VALUES (
  '<your-user-id>',
  'Lightweight tent recommendations',
  '{"screen": "inventory", "locale": "en", "inventoryCount": 15}'::jsonb
)
RETURNING id;

-- Insert test messages (replace <conversation-id>)
INSERT INTO messages (conversation_id, role, content) VALUES
  ('<conversation-id>', 'user', 'What are the lightest tents under 2 pounds?'),
  ('<conversation-id>', 'assistant', 'Here are some excellent ultralight tents under 2 pounds: Zpacks Duplex (19.4 oz), Big Agnes Fly Creek HV UL1 (1 lb 14 oz), and Tarptent ProTrail (1 lb 11 oz).');
```

**Get Your User ID**:
```bash
npx supabase db query "SELECT id FROM auth.users WHERE email = 'your-email@example.com';"
```

---

## Step 8: Run Development Server

```bash
npm run dev
```

**Verify**:
- Navigate to `http://localhost:3000`
- Log in as a Trailblazer user
- Look for AI Assistant icon in title bar

---

## Step 9: Test AI Assistant

### Basic Flow Test

1. **Open AI Modal**: Click AI icon in title bar
2. **Send Test Message**: Type "What is base weight?" and press Enter
3. **Expected Result**:
   - Message appears in conversation
   - AI response streams in (from cached response)
   - Response saved to database

### Rate Limiting Test

1. **Send 31 Messages**: Use automated script or manual sending
2. **Expected Result**:
   - First 30 messages succeed
   - 31st message shows rate limit error
   - Toast notification shows reset time

**Test Script** (Node.js):
```typescript
// test-rate-limit.ts
for (let i = 0; i < 31; i++) {
  await sendAIMessage({
    conversationId: '<your-conversation-id>',
    messageContent: `Test message ${i}`,
    context: { screen: 'inventory', locale: 'en', inventoryCount: 15 },
  });
}
```

### Multi-Session Sync Test

1. **Open Two Browser Tabs**: Both on `localhost:3000/inventory`
2. **Send Message in Tab 1**: Type message in AI modal
3. **Expected Result**: Message appears in Tab 2 within 2 seconds

---

## Step 10: Verify Database State

### Check Messages Table

```bash
npx supabase db query "
  SELECT m.role, m.content, m.created_at
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.user_id = '<your-user-id>'
  ORDER BY m.created_at DESC
  LIMIT 10;
"
```

### Check Rate Limits

```bash
npx supabase db query "
  SELECT user_id, count, window_start, last_message_at
  FROM rate_limits
  WHERE user_id = '<your-user-id>';
"
```

---

## Troubleshooting

### Issue: "AI_GATEWAY_API_KEY is not defined"

**Solution**:
```bash
# Verify .env.local contains AI_GATEWAY_API_KEY
cat .env.local | grep AI_GATEWAY_API_KEY

# Restart dev server
npm run dev
```

### Issue: Database migration fails

**Solution**:
```bash
# Check Supabase connection
npx supabase db ping

# Reset database (WARNING: deletes all data)
npx supabase db reset

# Reapply migrations
npx supabase migration up
```

### Issue: Messages not syncing across tabs

**Solution**:
```bash
# Check Supabase Realtime is enabled
# Go to Supabase Dashboard → Settings → API → Enable Realtime

# Verify RLS policies allow reads
npx supabase db query "
  SELECT * FROM pg_policies WHERE tablename = 'messages';
"
```

### Issue: Rate limit not enforcing

**Solution**:
```bash
# Check rate_limits table has correct function
npx supabase db query "
  SELECT check_rate_limit('<your-user-id>', '/api/chat', 30, 1);
"

# Should return: {"exceeded": false, "count": <current>, "limit": 30}
```

---

## Next Steps

1. **Implement UI Components**: Create chat modal, message bubbles, input field
2. **Implement Custom Hooks**: `useAIChat`, `useConversationSync`, `useRateLimiting`
3. **Test AI Integration**: Send real queries to Vercel AI SDK
4. **Add OpenTelemetry Tracing**: Monitor latency and errors

**Ready to Start**: Phase 2 implementation (tasks.md)

---

## Quick Reference

### Useful Commands

```bash
# Database
npx supabase db diff                    # Show schema changes
npx supabase db reset                   # Reset database
npx supabase gen types typescript       # Regenerate types

# Development
npm run dev                             # Start dev server
npm run build                           # Production build
npm run lint                            # Run ESLint

# Testing
npm test                                # Run all tests
npm run test:e2e                        # Run Playwright E2E tests
```

### Important File Locations

```
specs/050-ai-assistant/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan
├── research.md          # Research findings
├── data-model.md        # Database schema
├── quickstart.md        # This file
└── contracts/           # API contracts
    ├── ai-query.md
    ├── actions.md
    └── realtime.md

supabase/migrations/
└── 050_ai_assistant.sql # Database migration

types/
└── supabase.ts          # Generated types

.env.local               # Environment variables (not committed)
```

---

**Generated**: 2025-12-16 | **Status**: Ready for use
