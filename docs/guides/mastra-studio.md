# Mastra Studio Guide

**Tool**: Mastra Studio (included with `mastra` npm package)
**Purpose**: Real-time debugging and monitoring of Mastra agents
**URL**: `http://localhost:4111` (default)

## What is Mastra Studio?

Mastra Studio ist das Dashboard für deinen Mastra Agent. Es zeigt in Echtzeit:

- 🧠 **Memory**: Observations, Reflections, Token Usage
- 💬 **Conversations**: Message History, Tool Calls
- 📊 **Metrics**: Performance, Costs, Latency
- 🔍 **Debugging**: Traces, Logs, Errors

**Wichtig**: Studio ist **nur für Development/Debugging**. Nicht in Production exposen!

## Quick Start

### Option 1: Dev Mode (Empfohlen)

```bash
# Im Projektverzeichnis
npx mastra dev
```

Startet:
- ✅ Mastra Studio UI → `http://localhost:4111`
- ✅ API Server für Agents
- ✅ Hot Reload bei Code-Änderungen
- ✅ Auto-Open im Browser

**Dann:**
1. Browser öffnet automatisch `http://localhost:4111`
2. Teste den Agent über deine App (http://localhost:3000)
3. Studio zeigt alle Aktivitäten in Echtzeit

### Option 2: Studio Standalone

```bash
npx mastra studio
```

Startet nur das Studio UI (ohne Dev-Server).
Verbindet sich mit laufender Next.js App.

**Use Case:** Wenn Next.js bereits läuft (`npm run dev`)

### Option 3: Custom Port

```bash
# Studio auf anderem Port
npx mastra dev --port 4112
```

**Wichtig**: Port muss frei sein!

## Studio UI Overview

### Dashboard (Home)

```
┌─────────────────────────────────────┐
│  Mastra Studio                      │
├─────────────────────────────────────┤
│                                     │
│  📊 Active Agents: 1                │
│     └─ gear-assistant (Claude)      │
│                                     │
│  💬 Conversations: 12               │
│     └─ 3 active threads             │
│                                     │
│  🧠 Memory Status:                  │
│     └─ OM enabled (thread scope)    │
│                                     │
│  📈 Metrics (last 24h):             │
│     └─ 234 messages processed       │
│     └─ 1.2M tokens used             │
│     └─ $3.45 total cost             │
│                                     │
└─────────────────────────────────────┘
```

### Conversations Tab

Liste aller Threads:

| Thread ID | User | Started | Messages | Status |
|-----------|------|---------|----------|--------|
| 8f3a9... | user_123 | 2h ago | 15 | Active |
| 4d2b1... | user_456 | 1d ago | 42 | Archived |

**Actions:**
- Click auf Thread → Details anzeigen
- 🗑️ Delete Thread
- 📥 Export Conversation (JSON)

### Memory Tab (⭐ Most Important!)

**Für Observational Memory:**

```
Thread: 8f3a9d2b...
User: user_123

📊 Token Budget:
┌─────────────────────────────────┐
│ Messages:     18,234 / 20,000   │ ⚠️ 91% (Observer pending)
│ Observations:  2,847 / 40,000   │ ✅ 7%
└─────────────────────────────────┘

🔴 Observer Status:
  Model: google/gemini-2.5-flash
  Status: Running (15s elapsed)
  Processing: 8 messages
  Expected compression: ~38×
  ETA: 5s

📝 Current Observations (3):
┌─────────────────────────────────────────────────────────┐
│ [2026-02-06 12:10:23]                                   │
│ 🔴 User has 50 gear items in inventory:                 │
│   - 15 backpacks (mostly ultralight: Hyperlite, ...)    │
│   - 12 jackets (Arc'teryx, Patagonia, synthetic)        │
│   - 8 sleeping bags (temp range -5°C to +15°C)          │
│                                                          │
│ Token savings: 4,823 → 102 (47× compression)            │
│ [Details ▼]                                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ [2026-02-06 12:12:45]                                   │
│ 🟡 User is comparing Arc'teryx Alpha SV vs Beta AR      │
│    for alpine climbing. Asked about waterproofing.      │
│                                                          │
│ Token savings: 3,156 → 87 (36× compression)             │
│ [Details ▼]                                             │
└─────────────────────────────────────────────────────────┘

💡 Current Task:
  "Help user choose between two jackets for alpine climbing"

🎯 Suggested Response:
  "Based on your preference for synthetic insulation and
   your €800 budget, I'd recommend..."

📊 Memory Stats:
  Total observations: 3
  Total reflections: 0
  Compression ratio: 38×
  Token savings: 42,156 tokens
  Cost savings: $0.126 (at $0.003/1k tokens)
```

**Actions:**
- Click auf `[Details ▼]` → Original messages anzeigen
- Export Observations (JSON)
- Manually trigger Observer/Reflector

### Metrics Tab

Performance-Metriken:

```
📊 Last 24 Hours

Requests: 234
├─ Success: 228 (97%)
├─ Error: 6 (3%)
└─ Avg latency: 2.3s

Token Usage: 1,245,678
├─ Input: 892,345 (72%)
├─ Output: 353,333 (28%)
└─ Cached: 567,890 (45% cache hit rate)

Cost Breakdown: $3.45
├─ Claude API: $2.89
├─ Embeddings: $0.34
├─ Gemini (OM): $0.22

Tool Calls: 156
├─ queryUserData: 89 (57%)
├─ queryCatalog: 42 (27%)
├─ queryGearGraph: 18 (12%)
└─ searchWeb: 7 (4%)
```

### Traces Tab

OpenTelemetry distributed tracing:

```
Trace: 8f3a9d2b...
Duration: 3.2s

┌─ POST /api/mastra/chat (0ms)
│  ├─ Mastra Agent.stream() (50ms)
│  │  ├─ Load Memory (120ms)
│  │  │  ├─ PostgresStore.getMessages() (45ms)
│  │  │  ├─ PgVector.search() (62ms)
│  │  │  └─ Load Observations (13ms)
│  │  ├─ Claude API call (2,100ms) ⚠️ slow
│  │  │  └─ 4 tool calls
│  │  │     ├─ queryUserData (450ms)
│  │  │     ├─ queryCatalog (380ms)
│  │  │     ├─ queryGearGraph (290ms)
│  │  │     └─ queryUserData (210ms)
│  │  └─ Save to Memory (85ms)
│  └─ Response (5ms)
```

Click auf Trace → Detailed view mit spans, logs, attributes.

## Key Features

### 1. Real-Time Monitoring

Studio verwendet **WebSockets** für Live-Updates:
- Memory changes erscheinen sofort
- Token counts update in Echtzeit
- Observer/Reflector Status live

### 2. Export & Analysis

**Export Conversation:**
```bash
# Via UI: Click "Export" button
# Oder via CLI:
npx mastra export --thread 8f3a9d2b... --format json > conv.json
```

**Export Observations:**
```json
{
  "thread_id": "8f3a9d2b...",
  "observations": [
    {
      "timestamp": "2026-02-06T12:10:23Z",
      "importance": "high",
      "content": "User has 50 gear items...",
      "tokens_saved": 4721,
      "compression_ratio": 47.2
    }
  ]
}
```

### 3. Manual Trigger

**Force Observer:**
```bash
# Via Studio UI: Memory Tab → "Trigger Observer" button
# Oder via CLI:
npx mastra memory observe --thread 8f3a9d2b...
```

**Use Case:** Testen von OM ohne auf 20k tokens zu warten.

### 4. Memory Inspector

**Drill down into observations:**

```
Observation #1 (2026-02-06 12:10:23)
─────────────────────────────────────
Importance: 🔴 High

Content:
  User has 50 gear items in inventory:
  - 15 backpacks (mostly ultralight: Hyperlite, Gossamer Gear)
  ...

Derived from:
  ├─ Message #23 (user): "What backpacks do I have?"
  ├─ Tool Call: queryUserData(sql="SELECT * FROM gear_items...")
  │  └─ Result: 50 items (5,234 tokens)
  ├─ Message #24 (assistant): "You have 15 backpacks..."
  └─ Message #25 (user): "Which ones are ultralight?"

Compression:
  Original: 5,234 tokens
  Observed: 102 tokens
  Ratio: 51.3×
  Cost saved: $0.0157

Token breakdown:
  ├─ Tool results: 4,890 tokens → 65 tokens (75×)
  ├─ User messages: 234 tokens → 24 tokens (10×)
  └─ Assistant msgs: 110 tokens → 13 tokens (8×)
```

## Common Workflows

### 1. Debugging Tool Calls

**Scenario:** Tool calls sind langsam

```
1. Open Studio → Traces Tab
2. Find slow request
3. Drill down: POST /api/mastra/chat
4. Check tool call spans:
   queryUserData: 2,500ms ⚠️ SLOW!
5. Click span → See SQL query
6. Optimize query or add index
```

### 2. Monitoring OM Performance

**Scenario:** Prüfen ob OM effektiv komprimiert

```
1. Open Studio → Memory Tab
2. Select thread with many messages
3. Check "Memory Stats":
   - Compression ratio: 38× ✅ good
   - Token savings: 42k tokens ✅ significant
   - Cost savings: $0.126 ✅ measurable
4. If ratio < 10×: Check OM model or threshold
```

### 3. Cost Attribution

**Scenario:** Welcher User verursacht hohe costs?

```
1. Open Studio → Metrics Tab
2. Filter by resource_id (user ID)
3. Sort by cost descending
4. Drill into high-cost threads:
   - Many tool calls? → Optimize queries
   - Long conversations? → OM not triggering?
   - Large responses? → Adjust model params
```

### 4. Export for Analysis

**Scenario:** Analyze conversations offline

```bash
# Export all threads for a user
npx mastra export --resource user_123 --format jsonl > user_123.jsonl

# Import into analysis tool (Python, R, etc.)
cat user_123.jsonl | jq '.observations[] | .compression_ratio' | stats
# → Mean compression: 34.2×
```

## Troubleshooting

### Studio not starting?

**Error:** `Port 4111 already in use`

```bash
# Check what's using the port
lsof -i :4111

# Kill process or use different port
npx mastra dev --port 4112
```

**Error:** `Cannot find mastra config`

```bash
# Studio needs to be run from project root
cd /path/to/gearshack-winterberry
npx mastra dev
```

### Studio shows no data?

**Check 1:** Is Mastra Agent running?
```bash
# Your Next.js app must be running
npm run dev
```

**Check 2:** DATABASE_URL correct?
```bash
echo $DATABASE_URL | grep -o "postgres.*"
# Should show Supabase connection string
```

**Check 3:** Has agent been used?
```typescript
// Memory is lazy - Studio shows nothing until first conversation
// → Test the agent via your app first
```

### Observations not appearing?

**Check 1:** Token threshold reached?
```
Memory Tab → Token Budget
Messages: 12,345 / 20,000  ← OM triggers at 20k
```

**Check 2:** OM enabled?
```bash
echo $OBSERVATIONAL_MEMORY_ENABLED
# Should be: true (or empty)
```

**Check 3:** Observer model accessible?
```bash
# Test model via curl
curl -X POST https://gateway.vercel.com/v1/chat/completions \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
  -d '{"model":"google/gemini-2.5-flash","messages":[{"role":"user","content":"hi"}]}'
```

## Security Notes

### Development Only

**⚠️ NEVER expose Studio in production:**

```typescript
// ❌ BAD: Studio accessible from anywhere
if (process.env.NODE_ENV === 'production') {
  // Studio still running!
}

// ✅ GOOD: Studio only in development
if (process.env.NODE_ENV === 'development') {
  // npx mastra dev
}
```

### Data Privacy

Studio zeigt **alle** conversation data:
- User messages (potentially PII)
- Tool results (user data from DB)
- Observations (compressed but still sensitive)

**Best Practice:**
- Only run Studio locally (localhost)
- Don't screenshot/share Studio with PII
- Use anonymized test data for demos

### Access Control

Studio hat **keine** eingebaute Auth:
- Jeder mit localhost-Zugriff kann alles sehen
- In shared dev environments: Be careful

**Workaround:**
```bash
# Run Studio on non-default port
npx mastra dev --port 40123

# Or tunnel via SSH
ssh -L 4111:localhost:4111 dev-server
```

## Advanced: Custom Studio Config

### mastra.config.ts (optional)

Create `mastra.config.ts` in project root:

```typescript
import { defineConfig } from 'mastra';

export default defineConfig({
  studio: {
    port: 4111,
    openBrowser: true,
    cors: {
      origin: 'http://localhost:3000',
    },
  },
  agents: {
    'gear-assistant': {
      // Agent config here
    },
  },
});
```

### Environment-Specific Config

```typescript
export default defineConfig({
  studio: {
    port: process.env.MASTRA_STUDIO_PORT || 4111,
    openBrowser: process.env.CI !== 'true',  // Don't open in CI
  },
});
```

## Related Docs

- [Observational Memory](../features/observational-memory.md)
- [AI Assistant](../features/ai-assistant.md)
- [Mastra Official Docs](https://mastra.ai/docs/studio)

## Quick Reference

```bash
# Start Studio (with dev server)
npx mastra dev

# Start Studio (standalone)
npx mastra studio

# Custom port
npx mastra dev --port 4112

# Export conversation
npx mastra export --thread <id> --format json

# Manual trigger Observer
npx mastra memory observe --thread <id>

# Check version
npx mastra --version
```

---

**Last Updated**: 2026-02-06
**Mastra Version**: 1.0.1
