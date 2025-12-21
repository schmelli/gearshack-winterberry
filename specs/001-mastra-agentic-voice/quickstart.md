# Quickstart Guide: Mastra Agentic Voice AI

**Feature**: 001-mastra-agentic-voice
**Created**: 2025-12-20
**Target Audience**: Developers setting up local Mastra integration

---

## Overview

This guide enables developers to set up and test the Mastra Agentic Voice AI integration locally in **under 30 minutes**.

**What You'll Build**:
- Mastra agent embedded in Next.js with memory persistence
- Streaming chat endpoint compatible with Vercel AI SDK
- MCP integration with GearGraph for intelligent gear queries
- Voice transcription and synthesis endpoints

---

## Prerequisites

### Required Software

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Node.js** | 18.0+ | Runtime environment |
| **npm** | 9.0+ | Package manager |
| **TypeScript** | 5.0+ | Type checking |
| **PostgreSQL** | 14.0+ | Database (via Supabase) |

**Check Versions**:
```bash
node --version   # v18.0.0 or higher
npm --version    # 9.0.0 or higher
tsc --version    # 5.0.0 or higher
```

---

### Required Accounts & Services

1. **Supabase Project** (existing):
   - Connection string
   - Anon key
   - Service role key

2. **OpenAI API Key** (for Whisper + TTS):
   - Sign up at https://platform.openai.com
   - Generate API key from API Keys section

3. **GearGraph MCP Server** (local or remote):
   - Local: Running on `stdio` transport
   - Remote: HTTP endpoint (e.g., `http://localhost:3001`)

---

## Installation

### Step 1: Install Mastra Dependencies

```bash
npm install mastra @mastra/memory @modelcontextprotocol/sdk prom-client pino
```

**Package Purposes**:
- `mastra`: Core agentic framework
- `@mastra/memory`: Memory adapter interface
- `@modelcontextprotocol/sdk`: MCP protocol client
- `prom-client`: Prometheus metrics
- `pino`: Structured logging (JSON format)

---

### Step 2: Configure Environment Variables

Create or update `.env.local`:

```env
# ============================================
# Mastra Configuration
# ============================================
MASTRA_RUNTIME=nodejs
MASTRA_LOG_LEVEL=info

# ============================================
# Supabase (existing)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# MCP Server Configuration
# ============================================
# Option 1: Local stdio transport
MCP_TRANSPORT=stdio
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=/path/to/geargraph-mcp/dist/index.js

# Option 2: Remote HTTP transport
# MCP_TRANSPORT=http
# MCP_ENDPOINT=http://localhost:3001

# ============================================
# OpenAI (for voice features)
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# Observability
# ============================================
PROMETHEUS_ENABLED=true
LOG_FORMAT=json
MASTRA_METRICS_API_KEY=your-secret-metrics-key-here

# ============================================
# Feature Flags
# ============================================
MASTRA_MEMORY_ENABLED=true
MASTRA_VOICE_ENABLED=true
MASTRA_WORKFLOWS_ENABLED=true
```

**Verify Configuration**:
```bash
# Check if Supabase connection works
npm run test:supabase-connection

# Check if MCP server is accessible
npm run test:mcp-connection
```

---

## Database Setup

### Step 3: Create Supabase Migration

```bash
# Create new migration file
npx supabase migration new mastra_tables
```

**Copy SQL from `data-model.md`** into the migration file:

```sql
-- supabase/migrations/YYYYMMDD_mastra_tables.sql

-- ============================================
-- 1. Conversation Memory Table
-- ============================================
CREATE TABLE conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id, message_id)
);

CREATE INDEX idx_conversation_memory_user_conversation
  ON conversation_memory(user_id, conversation_id, created_at DESC);

CREATE INDEX idx_conversation_memory_metadata
  ON conversation_memory USING gin(metadata jsonb_path_ops);

CREATE INDEX idx_conversation_memory_updated
  ON conversation_memory(updated_at);

CREATE INDEX idx_conversation_memory_content_search
  ON conversation_memory USING gin(to_tsvector('english', message_content));

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own memory"
  ON conversation_memory
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON conversation_memory
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- 2. Workflow Executions Table
-- ============================================
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
  current_step TEXT,
  step_results JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_workflow_executions_user_status
  ON workflow_executions(user_id, status, started_at DESC);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own workflows"
  ON workflow_executions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON workflow_executions
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- 3. Rate Limit Tracking Table
-- ============================================
CREATE TABLE rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('simple_query', 'workflow', 'voice')),
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, operation_type, window_start)
);

CREATE INDEX idx_rate_limit_user_window
  ON rate_limit_tracking(user_id, window_start DESC);

ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own rate limits"
  ON rate_limit_tracking
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 4. GDPR Deletion Records Table
-- ============================================
CREATE TABLE gdpr_deletion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_deleted INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_gdpr_deletion_user
  ON gdpr_deletion_records(user_id, requested_at DESC);

ALTER TABLE gdpr_deletion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own deletion records"
  ON gdpr_deletion_records
  FOR ALL
  USING (user_id::text = auth.uid()::text);
```

**Apply Migration**:
```bash
# Push migration to Supabase
npx supabase db push

# Verify tables exist
npx supabase db list
```

**Expected Output**:
```
✔ Database migrated successfully
Tables created:
  - conversation_memory
  - workflow_executions
  - rate_limit_tracking
  - gdpr_deletion_records
```

---

## Development Server

### Step 4: Start Next.js Development Server

```bash
npm run dev
```

**Expected Output**:
```
  ▲ Next.js 16.0.7
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Compiled successfully
```

---

## Testing the Integration

### Test 1: Verify Mastra Agent Initialization

**Create Test Script**: `scripts/test-mastra-init.ts`

```typescript
import { createMastraAgent } from '@/lib/mastra/agent';

async function testAgentInit() {
  console.log('Initializing Mastra agent...');

  const agent = await createMastraAgent({
    userId: 'test-user-123',
    model: 'gpt-4o-mini',
    enableMemory: true,
    enableMCP: true,
  });

  console.log('✅ Agent initialized successfully');
  console.log('Agent name:', agent.name);
  console.log('Model:', agent.model);
  console.log('Tools available:', agent.tools.length);

  return agent;
}

testAgentInit()
  .then(() => console.log('✅ All tests passed'))
  .catch((error) => console.error('❌ Test failed:', error));
```

**Run Test**:
```bash
npx tsx scripts/test-mastra-init.ts
```

**Expected Output**:
```
Initializing Mastra agent...
✅ Agent initialized successfully
Agent name: gearshack-assistant
Model: gpt-4o-mini
Tools available: 12
✅ All tests passed
```

---

### Test 2: Memory Persistence Test

**Create Test Script**: `scripts/test-memory.ts`

```typescript
import { SupabaseMemoryAdapter } from '@/lib/mastra/adapters/supabase-memory-adapter';
import { createClient } from '@supabase/supabase-js';

async function testMemory() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const adapter = new SupabaseMemoryAdapter(supabase);
  const testUserId = 'test-user-' + Date.now();

  console.log('Testing memory persistence...');

  // Save message
  await adapter.saveMessages([
    {
      id: 'msg-1',
      userId: testUserId,
      conversationId: 'conv-1',
      role: 'user',
      content: 'What is my lightest tent?',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log('✅ Message saved');

  // Retrieve message
  const messages = await adapter.getMessages({
    userId: testUserId,
    conversationId: 'conv-1',
  });

  console.log('✅ Messages retrieved:', messages.length);

  if (messages.length === 1 && messages[0].content === 'What is my lightest tent?') {
    console.log('✅ Memory persistence working correctly');
  } else {
    throw new Error('Memory retrieval failed');
  }

  // Cleanup
  await adapter.deleteMessages({ userId: testUserId });
  console.log('✅ Test data cleaned up');
}

testMemory()
  .then(() => console.log('✅ Memory test passed'))
  .catch((error) => console.error('❌ Memory test failed:', error));
```

**Run Test**:
```bash
npx tsx scripts/test-memory.ts
```

**Expected Output**:
```
Testing memory persistence...
✅ Message saved
✅ Messages retrieved: 1
✅ Memory persistence working correctly
✅ Test data cleaned up
✅ Memory test passed
```

---

### Test 3: MCP Connection Test

**Create Test Script**: `scripts/test-mcp.ts`

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCP() {
  console.log('Testing MCP connection...');

  const transport = new StdioClientTransport({
    command: process.env.MCP_SERVER_COMMAND!,
    args: [process.env.MCP_SERVER_ARGS!],
  });

  const client = new Client({
    name: 'mastra-test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await client.connect(transport);
  console.log('✅ Connected to MCP server');

  // List available tools
  const tools = await client.listTools();
  console.log('✅ Tools discovered:', tools.tools.length);

  tools.tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  await client.close();
  console.log('✅ MCP connection closed');
}

testMCP()
  .then(() => console.log('✅ MCP test passed'))
  .catch((error) => console.error('❌ MCP test failed:', error));
```

**Run Test**:
```bash
npx tsx scripts/test-mcp.ts
```

**Expected Output**:
```
Testing MCP connection...
✅ Connected to MCP server
✅ Tools discovered: 8
  - searchGear: Search gear items by category, weight, etc.
  - findAlternatives: Find lighter alternatives to a gear item
  - queryGearGraph: Traverse the equipment graph for complex queries
  ...
✅ MCP connection closed
✅ MCP test passed
```

---

### Test 4: Streaming SSE Test

**Create Test Script**: `scripts/test-sse.ts`

```typescript
async function testSSE() {
  console.log('Testing streaming chat endpoint...');

  const response = await fetch('http://localhost:3000/api/mastra/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TEST_USER_JWT}`,
    },
    body: JSON.stringify({
      message: 'What is the lightest tent?',
      conversationId: 'test-conv-' + Date.now(),
    }),
  });

  console.log('✅ Response received:', response.status);

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let chunks: string[] = [];

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    chunks.push(chunk);
    console.log('Chunk:', chunk);
  }

  console.log('✅ Streaming test completed');
  console.log('Total chunks received:', chunks.length);

  if (chunks.some((c) => c.includes('[DONE]'))) {
    console.log('✅ Stream ended correctly');
  }
}

testSSE()
  .then(() => console.log('✅ SSE test passed'))
  .catch((error) => console.error('❌ SSE test failed:', error));
```

**Run Test**:
```bash
npx tsx scripts/test-sse.ts
```

**Expected Output**:
```
Testing streaming chat endpoint...
✅ Response received: 200
Chunk: data: {"type":"text","content":"Let me check your inventory..."}
Chunk: data: {"type":"tool_call","tool":"searchGear","args":{...}}
Chunk: data: {"type":"text","content":"Your lightest tent is..."}
Chunk: data: [DONE]
✅ Streaming test completed
Total chunks received: 4
✅ Stream ended correctly
✅ SSE test passed
```

---

## Verification Checklist

After completing the quickstart, verify all components:

- [ ] **Database**: All 4 tables created in Supabase
- [ ] **Mastra Agent**: Initializes without errors
- [ ] **Memory Adapter**: Saves and retrieves messages correctly
- [ ] **MCP Connection**: Successfully discovers GearGraph tools
- [ ] **Streaming Endpoint**: Returns SSE stream with `[DONE]` marker
- [ ] **Environment Variables**: All required vars set in `.env.local`
- [ ] **Development Server**: Runs on `http://localhost:3000`

---

## Troubleshooting

### Issue: "Supabase connection failed"

**Symptom**:
```
Error: connect ECONNREFUSED
```

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` is valid
3. Ensure database is running: `npx supabase status`

---

### Issue: "MCP server unreachable"

**Symptom**:
```
Error: spawn ENOENT
```

**Solution**:
1. Verify MCP server is running: `ps aux | grep geargraph-mcp`
2. Check `MCP_SERVER_COMMAND` and `MCP_SERVER_ARGS` paths
3. Try HTTP transport instead of stdio:
   ```env
   MCP_TRANSPORT=http
   MCP_ENDPOINT=http://localhost:3001
   ```

---

### Issue: "Memory queries return empty"

**Symptom**:
```
✅ Messages retrieved: 0
```

**Solution**:
1. Verify RLS policies allow service role access
2. Check `user_id` matches `auth.uid()`
3. Inspect logs: `npx supabase logs`

---

### Issue: "Voice transcription fails"

**Symptom**:
```
Error: Invalid API key
```

**Solution**:
1. Verify `OPENAI_API_KEY` is set in `.env.local`
2. Check API key is valid at https://platform.openai.com
3. Ensure audio file format is supported (WAV, MP3, M4A, WEBM, OGG)

---

## Next Steps

After completing this quickstart:

1. **Explore Workflows**: Implement the trip planning workflow (see `spec.md`)
2. **Add Voice UI**: Build frontend components for voice recording
3. **Configure Observability**: Set up Prometheus + Grafana dashboards
4. **Deploy to Staging**: Test with real users (25 concurrent limit)

---

## Additional Resources

- **Data Model**: See `data-model.md` for complete database schema
- **API Contracts**: See `contracts/` directory for endpoint specifications
- **Spec Document**: See `spec.md` for user stories and requirements
- **Mastra Docs**: https://mastra.dev/docs
- **MCP Protocol**: https://modelcontextprotocol.io

---

## Support

**Issues**:
- Database problems: Check Supabase logs
- MCP errors: Verify GearGraph server is running
- Memory issues: Inspect RLS policies

**Common Errors**:
- `ECONNREFUSED`: Service not running
- `ENOENT`: Invalid file path
- `401 Unauthorized`: Invalid API key or JWT

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial quickstart guide |

---

**Estimated Setup Time**: 20-30 minutes (depending on Supabase migration speed)

**Success Metric**: All 4 test scripts pass without errors.
