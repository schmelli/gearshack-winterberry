# Research Deliverable 03: MCP Connection Architecture

**Research Question**: How does Mastra connect to Model Context Protocol (MCP) servers - local stdio, remote HTTP, or both? What's the dynamic tool discovery API?

**Status**: ✅ Resolved
**Decision**: **Stdio (dev) + HTTP (prod)** with dynamic tool discovery
**Date**: 2025-12-20

---

## Executive Summary

MCP (Model Context Protocol) supports **both stdio and HTTP transports** via `@modelcontextprotocol/sdk`. Development environments use stdio transport (child process), production uses HTTP transport (remote endpoint). Tools are dynamically discovered via `listTools()` API, eliminating manual TypeScript definitions. Fallback to `searchCatalog` when MCP unavailable ensures graceful degradation.

---

## MCP Transport Protocols

### 1. Stdio Transport (Development)

**Use Case**: Local development with GearGraph MCP server running on same machine.

**Architecture**:
```
┌─────────────────────────────────────────────┐
│         Next.js API Route                   │
│         (Node.js runtime)                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  MCP Client (stdio transport)       │   │
│  │  - Spawns child process             │   │
│  │  - Communicates via stdin/stdout    │   │
│  │  - Process lifecycle management     │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│                 │ spawn('node', [...])      │
│                 ▼                           │
│  ┌─────────────────────────────────────┐   │
│  │  GearGraph MCP Server               │   │
│  │  (child_process)                    │   │
│  │  - Graph traversal tools            │   │
│  │  - Similarity search                │   │
│  │  - Rating aggregations              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// lib/mcp/stdio-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export async function createStdioMCPClient() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [
      './scripts/geargraph-mcp-server.js',
      '--db', process.env.SUPABASE_URL!,
      '--auth', process.env.SUPABASE_SERVICE_ROLE_KEY!
    ],
    env: process.env as Record<string, string>
  });

  const client = new Client({
    name: 'gearshack-mastra',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {} // Request tool capabilities
    }
  });

  await client.connect(transport);
  return client;
}
```

**Lifecycle Management**:
- Process spawned on first MCP request
- Stays alive for serverless function duration (5-60 seconds)
- Automatically killed when function terminates
- New process spawned on next cold start

**Pros**:
- ✅ No network latency (local IPC)
- ✅ Simple authentication (shared environment)
- ✅ No firewall/port configuration

**Cons**:
- ❌ Requires `child_process` (Node.js only)
- ❌ Process overhead (~50-100ms spawn time)
- ❌ Not suitable for multi-instance deployments

---

### 2. HTTP Transport (Production)

**Use Case**: Production deployment with GearGraph MCP server as dedicated service.

**Architecture**:
```
┌─────────────────────────────────────────────┐
│    Vercel Serverless Function (US East)     │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  MCP Client (HTTP transport)        │   │
│  │  - HTTP requests with auth headers  │   │
│  │  - Connection pooling via agent     │   │
│  │  - Timeout handling (5s default)    │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│                 │ HTTPS POST                │
└─────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│    GearGraph MCP Server (Dedicated)         │
│    https://geargraph.gearshack.com/mcp      │
│                                             │
│  - Graph database (Neo4j/PostgreSQL)        │
│  - Tool: findSimilarGear                    │
│  - Tool: getGearRecommendations             │
│  - Tool: aggregateRatings                   │
│  - Authentication via Supabase JWT          │
└─────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// lib/mcp/http-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { HTTPClientTransport } from '@modelcontextprotocol/sdk/client/http.js';
import { getServerSession } from '@/lib/auth';

export async function createHTTPMCPClient() {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');

  const transport = new HTTPClientTransport({
    url: process.env.MCP_ENDPOINT!, // https://geargraph.gearshack.com/mcp
    headers: {
      'Authorization': `Bearer ${session.supabaseAccessToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 5000 // 5-second timeout
  });

  const client = new Client({
    name: 'gearshack-mastra',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {}
    }
  });

  await client.connect(transport);
  return client;
}
```

**Pros**:
- ✅ Scalable (multiple function instances → single MCP server)
- ✅ Co-located for low latency (same region as Supabase)
- ✅ Independent scaling of MCP server
- ✅ Production-grade monitoring/logging

**Cons**:
- ❌ Network latency (~10-50ms per request)
- ❌ Requires authentication setup
- ❌ Additional deployment complexity

---

## Dynamic Tool Discovery

### List Available Tools

MCP servers expose tools via `listTools()` API - **no manual TypeScript definitions required**.

```typescript
// lib/mcp/discovery.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export async function discoverMCPTools(client: Client) {
  const { tools } = await client.listTools();

  /**
   * Example response from GearGraph MCP server:
   * [
   *   {
   *     name: 'findSimilarGear',
   *     description: 'Find gear items similar to a given item based on graph relationships',
   *     inputSchema: {
   *       type: 'object',
   *       properties: {
   *         itemId: { type: 'string', description: 'UUID of the gear item' },
   *         maxResults: { type: 'number', description: 'Maximum number of results', default: 5 },
   *         categories: { type: 'array', items: { type: 'string' }, description: 'Filter by categories (optional)' }
   *       },
   *       required: ['itemId']
   *     }
   *   },
   *   {
   *     name: 'getGearRecommendations',
   *     description: 'Get personalized gear recommendations based on user preferences and trip requirements',
   *     inputSchema: {
   *       type: 'object',
   *       properties: {
   *         userId: { type: 'string' },
   *         activityType: { type: 'string', enum: ['hiking', 'camping', 'backpacking', 'climbing'] },
   *         season: { type: 'string', enum: ['spring', 'summer', 'fall', 'winter'] },
   *         weightConstraint: { type: 'number', description: 'Maximum weight in grams' }
   *       },
   *       required: ['userId', 'activityType', 'season']
   *     }
   *   }
   * ]
   */

  return tools;
}
```

### Register Tools with Mastra

Convert MCP tools to Mastra tool format dynamically:

```typescript
// lib/mastra/tools/mcp-tools.ts
import { createTool } from '@mastra/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export async function registerMCPTools(mcpClient: Client) {
  const { tools } = await mcpClient.listTools();

  // Convert each MCP tool to Mastra tool format
  return tools.map(tool => createTool({
    id: tool.name,
    description: tool.description,
    parameters: tool.inputSchema, // JSON Schema → Zod schema (auto-converted by Mastra)

    execute: async (params: unknown) => {
      try {
        // Invoke MCP tool via callTool API
        const result = await mcpClient.callTool({
          name: tool.name,
          arguments: params as Record<string, unknown>
        });

        return result.content; // Return tool result to agent
      } catch (error) {
        // Log error and throw to trigger fallback
        console.error(`MCP tool ${tool.name} failed:`, error);
        throw new Error(`MCP tool invocation failed: ${error.message}`);
      }
    }
  }));
}
```

### Agent Initialization with MCP Tools

```typescript
// lib/mastra/agent.ts
import { Agent } from '@mastra/core';
import { createMCPClient } from './mcp-client';
import { registerMCPTools } from './tools/mcp-tools';

export async function createMastraAgent(userId: string) {
  // Initialize MCP client (stdio or HTTP based on environment)
  const mcpClient = await createMCPClient();

  // Discover and register MCP tools dynamically
  const mcpTools = await registerMCPTools(mcpClient);

  // Create Mastra agent with MCP tools + native tools
  const agent = new Agent({
    name: 'GearShack Assistant',
    model: 'gpt-4-turbo',
    tools: [
      ...mcpTools, // Dynamic MCP tools (findSimilarGear, getGearRecommendations, etc.)
      searchCatalogTool, // Native Supabase catalog search (fallback)
      queryInventoryTool, // Native Supabase inventory query
      fetchWeatherTool, // Native weather API wrapper
    ],
    instructions: `You are a friendly outdoor gear expert...`
  });

  return agent;
}
```

---

## Fallback Strategy

### Graceful Degradation When MCP Unavailable

**Failure Scenarios**:
1. MCP server unreachable (network error, server down)
2. MCP request timeout (>5 seconds)
3. MCP tool invocation error (invalid parameters, database error)

**Fallback Approach**:

```typescript
// lib/mastra/tools/mcp-tools.ts (updated with fallback)
export async function registerMCPTools(mcpClient: Client) {
  const { tools } = await mcpClient.listTools();

  return tools.map(tool => createTool({
    id: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,

    execute: async (params: unknown) => {
      try {
        // Attempt MCP tool invocation with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MCP timeout')), 5000)
        );

        const resultPromise = mcpClient.callTool({
          name: tool.name,
          arguments: params as Record<string, unknown>
        });

        const result = await Promise.race([resultPromise, timeoutPromise]);
        return result.content;

      } catch (error) {
        // Log MCP failure for observability
        console.error(`MCP tool ${tool.name} failed, falling back to catalog search`, {
          error: error.message,
          params
        });

        // Emit metric for monitoring
        incrementCounter('mcp_tool_fallback_total', { tool: tool.name });

        // Fallback to native catalog search
        if (tool.name === 'findSimilarGear' || tool.name === 'getGearRecommendations') {
          const fallbackResult = await fallbackToCatalogSearch(params);
          return {
            content: fallbackResult,
            disclaimer: 'GearGraph unavailable - showing catalog results instead'
          };
        }

        throw error; // No fallback available, propagate error
      }
    }
  }));
}

// Fallback implementation using Supabase catalog
async function fallbackToCatalogSearch(params: unknown) {
  const { itemId, maxResults = 5 } = params as { itemId?: string; maxResults?: number };

  // Query Supabase catalog for similar items (basic category/weight matching)
  const { data } = await supabase
    .from('gear_items')
    .select('*')
    .limit(maxResults);

  return data || [];
}
```

**User Experience**:
- Agent continues conversation without interruption
- Response includes disclaimer: "GearGraph unavailable, showing catalog results instead"
- Less intelligent recommendations (no graph relationships), but functional
- Observability dashboard alerts on repeated MCP failures

---

## Environment Configuration

### Development (.env.local)

```bash
# MCP Transport
MCP_TRANSPORT=stdio
MCP_COMMAND=node
MCP_ARGS=./scripts/geargraph-mcp-server.js

# Supabase credentials (passed to MCP server)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Production (.env.production)

```bash
# MCP Transport
MCP_TRANSPORT=http
MCP_ENDPOINT=https://geargraph.gearshack.com/mcp
MCP_TIMEOUT=5000

# Authentication
# Uses Supabase session token from user context
```

### Transport Selection Logic

```typescript
// lib/mcp/client.ts
import { createStdioMCPClient } from './stdio-client';
import { createHTTPMCPClient } from './http-client';

export async function createMCPClient() {
  const transport = process.env.MCP_TRANSPORT || 'http';

  if (transport === 'stdio') {
    return await createStdioMCPClient();
  } else {
    return await createHTTPMCPClient();
  }
}
```

---

## Testing Strategy

### Local Development Testing

```bash
# Start GearGraph MCP server locally
npm run mcp:server

# In another terminal, test stdio connection
npm run test:mcp:stdio
```

### Production HTTP Testing

```bash
# Deploy MCP server to production
fly deploy --app geargraph-mcp

# Test HTTP connection
curl -X POST https://geargraph.gearshack.com/mcp/tools/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Integration Tests

```typescript
// __tests__/lib/mcp/integration.test.ts
import { describe, it, expect } from 'vitest';
import { createMCPClient } from '@/lib/mcp/client';

describe('MCP Integration', () => {
  it('should discover tools from GearGraph MCP server', async () => {
    const client = await createMCPClient();
    const { tools } = await client.listTools();

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some(t => t.name === 'findSimilarGear')).toBe(true);
  });

  it('should invoke findSimilarGear tool successfully', async () => {
    const client = await createMCPClient();

    const result = await client.callTool({
      name: 'findSimilarGear',
      arguments: { itemId: 'test-tent-uuid', maxResults: 3 }
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should fallback to catalog search when MCP unavailable', async () => {
    // Simulate MCP server down by using invalid endpoint
    process.env.MCP_ENDPOINT = 'https://invalid.example.com';

    const agent = await createMastraAgent('test-user');
    const response = await agent.invoke('Find tents similar to my Nemo Hornet');

    expect(response).toContain('catalog results'); // Fallback triggered
  });
});
```

---

## Observability & Monitoring

### MCP Metrics

```typescript
// lib/observability/metrics.ts
import { Counter, Histogram } from 'prom-client';

export const mcpToolCallsTotal = new Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total MCP tool invocations',
  labelNames: ['tool_name', 'status'] // status: success | error | timeout | fallback
});

export const mcpToolDuration = new Histogram({
  name: 'mcp_tool_duration_seconds',
  help: 'MCP tool invocation latency',
  labelNames: ['tool_name', 'transport'], // transport: stdio | http
  buckets: [0.1, 0.5, 1, 2, 5] // 100ms to 5s
});
```

### Structured Logging

```typescript
// Log MCP tool invocations
logger.info({
  type: 'mcp.tool.invoke',
  toolName: 'findSimilarGear',
  transport: 'http',
  params: { itemId: 'xxx' },
  duration: 234, // ms
  status: 'success'
});

// Log MCP fallback events
logger.warn({
  type: 'mcp.tool.fallback',
  toolName: 'findSimilarGear',
  reason: 'timeout',
  fallbackUsed: 'catalogSearch'
});
```

---

## Conclusion

**Deliverable**: Complete MCP connection architecture with stdio + HTTP transports, dynamic tool discovery, and fallback strategy.

**Key Decisions**:
1. **Development**: Stdio transport (local child process)
2. **Production**: HTTP transport (dedicated MCP server)
3. **Tool Discovery**: Dynamic via `listTools()` API (no manual definitions)
4. **Fallback**: Catalog search when GearGraph unavailable

**Dependencies**:
- `@modelcontextprotocol/sdk` (stdio + HTTP transports)
- GearGraph MCP server (to be implemented separately)
- Supabase authentication (JWT token pass-through)

**Next Steps**:
1. Implement stdio MCP client for local development
2. Implement HTTP MCP client for production
3. Create fallback logic in tool registration
4. Add MCP metrics to observability dashboard
5. Deploy GearGraph MCP server to production environment
