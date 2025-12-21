# MCP Connection Architecture for GearGraph Integration

**Document Version**: 1.0
**Created**: 2025-12-20
**Feature**: 001-mastra-agentic-voice
**Status**: Research Complete

## Executive Summary

This document provides a comprehensive architecture for integrating the Model Context Protocol (MCP) with Mastra to connect GearShack's AI assistant to the GearGraph knowledge base. The architecture prioritizes **stdio transport for development** with a clear **path to HTTP for production**, leverages **Mastra's native MCP client** for dynamic tool discovery, and implements **graceful degradation** when MCP is unavailable.

**Key Decisions**:
- **Development**: stdio transport (local MCP server as child process)
- **Production**: Streamable HTTP transport (remote MCP server)
- **Integration**: Mastra's `MCPClient` with automatic tool discovery
- **Fallback**: Graceful degradation to existing `searchCatalog` tool

---

## 1. MCP Transport Protocol Analysis

### 1.1 Transport Comparison

| Aspect | **stdio** | **Streamable HTTP** |
|--------|-----------|---------------------|
| **Use Case** | Local development, command-line tools, desktop apps | Production web services, multi-user applications, cloud deployments |
| **Communication** | Standard input/output streams | HTTP POST/GET with optional Server-Sent Events (SSE) |
| **Latency** | Microsecond-level (no network overhead) | Milliseconds (network transmission + HTTP parsing) |
| **Deployment** | Server executable must be installed locally on each machine | Single remote deployment, accessible by all clients |
| **Lifecycle** | Client spawns MCP server as subprocess, manages lifecycle | MCP server runs independently, handles multiple connections |
| **Authentication** | Process-level security (local user permissions) | HTTP-based (OAuth 2.1, API keys, custom headers) |
| **CORS** | Not applicable (local process) | Required for browser clients |
| **Scaling** | Single user per server instance | Horizontal scaling, session pooling (10x better performance) |
| **Debugging** | Simple (stdin/stdout are directly inspectable) | Requires network debugging tools |
| **Infrastructure** | No ports, no certificates, no network config | Standard HTTP infrastructure (load balancers, proxies, CDNs) |

**Sources**:
- [MCP Transport Protocols: stdio vs SSE vs StreamableHTTP](https://mcpcat.io/guides/comparing-stdio-sse-streamablehttp/)
- [MCP Server Transports: STDIO, Streamable HTTP & SSE](https://docs.roocode.com/features/mcp/server-transports)
- [15 Best Practices for Building MCP Servers in Production](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)

### 1.2 Protocol Details

#### stdio Transport
```typescript
// Messages are JSON-RPC 2.0 over newline-delimited JSON
// Client writes to server's STDIN, server responds via STDOUT
// Server can log to STDERR for debugging

// Message format (newline-delimited):
{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "id": 1, "result": {"tools": [...]}}
```

**Key Characteristics**:
- Messages delimited by newlines (must not contain embedded newlines)
- UTF-8 encoded JSON-RPC 2.0
- Server writes logs to stderr (won't interfere with stdout responses)
- Rarely times out (unless process hangs)

#### Streamable HTTP Transport
```typescript
// POST for client-to-server requests
POST /mcp HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}

// Response uses HTTP status codes + JSON-RPC
HTTP/1.1 200 OK
Content-Type: application/json

{"jsonrpc": "2.0", "id": 1, "result": {"tools": [...]}}

// Optional: Server-Sent Events for server-to-client notifications
GET /mcp HTTP/1.1
Accept: text/event-stream

data: {"jsonrpc": "2.0", "method": "notifications/progress", "params": {...}}
```

**Key Characteristics**:
- Single URL path for all MCP communication
- Supports basic request-response AND advanced streaming
- OAuth 2.1 authorization framework (March 2025 spec update)
- Can timeout (network failures, slow responses)

**Sources**:
- [Transports - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [What are MCP transports?](https://www.speakeasy.com/mcp/building-servers/protocol-reference/transports)

### 1.3 Recommendation by Environment

**Development (Local)**:
- **Use stdio transport** - fastest iteration, simple debugging, no network config
- MCP server runs as local process (e.g., `npx geargraph-mcp-server` or local executable)
- Perfect for testing tool definitions, prompt engineering, workflow development

**Production (Cloud)**:
- **Use Streamable HTTP transport** - horizontal scaling, centralized deployment, standard infrastructure
- MCP server deployed as remote service (e.g., Cloud Run, ECS, Kubernetes)
- Supports multiple simultaneous Mastra agent instances
- 10x performance with session pooling vs. spawning processes per request

**Sources**:
- [MCP Transport Protocols and Deployment](https://medium.com/@20ce01050/mcp-transport-protocols-and-deployment-choosing-between-stdio-and-http-for-ai-tools-1f2cd3dc6955)

---

## 2. Mastra MCP Client Integration

### 2.1 Overview

Mastra provides native MCP support via the `@mastra/mcp` package, which wraps the official `@modelcontextprotocol/sdk` and provides Mastra-specific functionality.

**Key Features**:
- Automatic transport detection (stdio vs. HTTP)
- Dynamic tool discovery via `getTools()` method
- Namespace isolation (tools prefixed with server name to prevent conflicts)
- Built-in error handling and connection management

**Sources**:
- [Mastra MCP Overview](https://mastra.ai/en/docs/tools-mcp/mcp-overview)
- [Why We're All-In on MCP | Mastra Blog](https://mastra.ai/blog/mastra-mcp)

### 2.2 Connection Initialization

#### Development: stdio Transport

```typescript
// lib/mastra/mcp-client.ts
import { MCPClient } from '@mastra/mcp';

export const gearGraphMCPClient = new MCPClient({
  id: 'geargraph-mcp-client',
  servers: {
    geargraph: {
      command: 'npx', // or 'node', 'python', etc.
      args: ['-y', 'geargraph-mcp-server'], // or path to local executable
    },
  },
});

// Auto-connect on import or explicitly
await gearGraphMCPClient.connect();
```

**How it works**:
1. Mastra spawns `npx -y geargraph-mcp-server` as a child process
2. Client writes JSON-RPC messages to process stdin
3. Server responds via stdout
4. Mastra manages process lifecycle (cleanup on disconnect)

#### Production: Streamable HTTP Transport

```typescript
// lib/mastra/mcp-client.ts
import { MCPClient } from '@mastra/mcp';

export const gearGraphMCPClient = new MCPClient({
  id: 'geargraph-mcp-client',
  servers: {
    geargraph: {
      url: new URL(process.env.GEARGRAPH_MCP_URL || 'https://mcp.geargraph.com'),
      // Optional: Authentication headers
      requestInit: {
        headers: {
          'Authorization': `Bearer ${process.env.GEARGRAPH_API_KEY}`,
        },
      },
      // IMPORTANT: For SSE connections with auth
      eventSourceInit: {
        headers: {
          'Authorization': `Bearer ${process.env.GEARGRAPH_API_KEY}`,
        },
      },
    },
  },
});
```

**How it works**:
1. Mastra detects `url` property and uses Streamable HTTP transport
2. First attempts protocol version `2025-03-26` (Streamable HTTP)
3. Falls back to `2024-11-05` (legacy SSE) if initial connection fails
4. `eventSourceInit` ensures auth headers are included in SSE connections

**Sources**:
- [Reference: MCPClient | Tools & MCP | Mastra Docs](https://mastra.ai/reference/tools/mcp-client)
- [Mastra Changelog 2025-01-17](https://mastra.ai/blog/changelog-2025-01-17)

### 2.3 Environment-Aware Configuration

```typescript
// lib/mastra/mcp-client.ts
import { MCPClient } from '@mastra/mcp';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const GEARGRAPH_MCP_URL = process.env.GEARGRAPH_MCP_URL;
const GEARGRAPH_MCP_COMMAND = process.env.GEARGRAPH_MCP_COMMAND || 'npx';
const GEARGRAPH_MCP_ARGS = process.env.GEARGRAPH_MCP_ARGS?.split(',') || ['-y', 'geargraph-mcp-server'];

export const gearGraphMCPClient = new MCPClient({
  id: 'geargraph-mcp-client',
  servers: {
    geargraph: IS_PRODUCTION && GEARGRAPH_MCP_URL
      ? {
          // Production: Streamable HTTP
          url: new URL(GEARGRAPH_MCP_URL),
          requestInit: {
            headers: {
              'Authorization': `Bearer ${process.env.GEARGRAPH_API_KEY}`,
            },
          },
          eventSourceInit: {
            headers: {
              'Authorization': `Bearer ${process.env.GEARGRAPH_API_KEY}`,
            },
          },
        }
      : {
          // Development: stdio
          command: GEARGRAPH_MCP_COMMAND,
          args: GEARGRAPH_MCP_ARGS,
        },
  },
});
```

**Environment Variables**:
```bash
# .env.local (development)
GEARGRAPH_MCP_COMMAND=npx
GEARGRAPH_MCP_ARGS=-y,geargraph-mcp-server

# .env.production
NODE_ENV=production
GEARGRAPH_MCP_URL=https://mcp.geargraph.com
GEARGRAPH_API_KEY=<secret>
```

---

## 3. Dynamic Tool Discovery

### 3.1 MCP Tool Discovery API

The MCP protocol provides a standardized method for clients to discover available tools at runtime:

```typescript
// @modelcontextprotocol/sdk Client API
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({ name: 'gearshack-client', version: '1.0.0' });

// List all available tools
const toolsResponse = await client.listTools();
// Returns: { tools: Tool[] }

// Each tool has:
interface Tool {
  name: string;              // e.g., "search_gear_by_category"
  description: string;       // Human-readable explanation
  inputSchema: JSONSchema;   // JSON Schema for parameters
}
```

**Sources**:
- [@modelcontextprotocol/sdk - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [GitHub - TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### 3.2 Mastra's Simplified Discovery

Mastra abstracts the low-level MCP client API with a high-level `getTools()` method:

```typescript
// lib/mastra/agent.ts
import { Agent } from '@mastra/core/agent';
import { gearGraphMCPClient } from './mcp-client';

export const gearShackAgent = new Agent({
  name: 'GearShack Assistant',
  instructions: '...', // System prompt
  model: anthropic('claude-sonnet-4.5'),
  tools: await gearGraphMCPClient.getTools(), // ✅ Auto-discover ALL tools
});
```

**How `getTools()` works**:
1. Calls `client.listTools()` internally for all configured servers
2. Transforms MCP tool definitions to Mastra's format
3. Adds server namespace prefix to prevent conflicts (e.g., `geargraph_searchByCategory`)
4. Returns ready-to-use tool definitions with `execute` functions

**Namespace Example**:
```typescript
// MCP server exposes tool: "searchByCategory"
// Mastra namespaces it: "geargraph_searchByCategory"

await gearGraphMCPClient.getTools();
// Returns:
{
  geargraph_searchByCategory: {
    description: "Search gear by category (tents, sleeping bags, etc.)",
    parameters: z.object({ category: z.string(), filters: z.object({...}) }),
    execute: async (args) => { /* calls MCP tool */ },
  },
  geargraph_findAlternatives: {
    description: "Find lighter/cheaper alternatives to a gear item",
    parameters: z.object({ gearId: z.string(), maxWeight: z.number() }),
    execute: async (args) => { /* calls MCP tool */ },
  },
  // ... all other tools from GearGraph MCP server
}
```

**Sources**:
- [Reference: MCPClient](https://mastra.ai/reference/tools/mcp-client)
- [MCP Overview | Tools & MCP | Mastra Docs](https://mastra.ai/en/docs/tools-mcp/mcp-overview)

### 3.3 Invoking Tools Dynamically

Once tools are discovered via `getTools()`, Mastra handles invocation automatically:

```typescript
// The Agent decides which tool to call based on user query
const agent = new Agent({
  name: 'GearShack Assistant',
  tools: await gearGraphMCPClient.getTools(),
});

// User asks: "Find ultralight tents under 1kg"
const response = await agent.generate({
  messages: [
    { role: 'user', content: 'Find ultralight tents under 1kg' },
  ],
});

// Behind the scenes:
// 1. Agent analyzes user intent
// 2. Selects appropriate tool: geargraph_searchByCategory
// 3. Constructs arguments: { category: "tents", filters: { maxWeight: 1000 } }
// 4. Calls tool.execute(args)
// 5. Receives results from GearGraph MCP server
// 6. Synthesizes natural language response
```

**Manual Tool Invocation** (for testing):
```typescript
import { MCPClient } from '@mastra/mcp';

const client = new MCPClient({ /* ... */ });
const tools = await client.getTools();

// Invoke specific tool manually
const result = await tools.geargraph_searchByCategory.execute({
  category: 'tents',
  filters: { maxWeight: 1000, priceMax: 500 },
});

console.log(result);
// { products: [...], totalCount: 12, appliedFilters: {...} }
```

**Sources**:
- [Creating a Model Context Protocol Server: A Step-by-Step Guide](https://michaelwapp.medium.com/creating-a-model-context-protocol-server-a-step-by-step-guide-4c853fbf5ff2)

---

## 4. Error Handling & Fallback Strategy

### 4.1 MCP Connection Failures

**Scenarios**:
1. MCP server process fails to start (stdio)
2. MCP server URL is unreachable (HTTP)
3. Authentication fails (invalid API key)
4. Network timeout (slow response)

**Error Handling Pattern**:

```typescript
// lib/mastra/mcp-client.ts
import { MCPClient } from '@mastra/mcp';

export let gearGraphMCPClient: MCPClient | null = null;
export let mcpToolsAvailable = false;

export async function initializeMCPClient(): Promise<boolean> {
  try {
    gearGraphMCPClient = new MCPClient({
      id: 'geargraph-mcp-client',
      servers: { /* ... */ },
    });

    // Test connection with timeout
    const toolsPromise = gearGraphMCPClient.getTools();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('MCP connection timeout (5s)')), 5000)
    );

    await Promise.race([toolsPromise, timeoutPromise]);

    mcpToolsAvailable = true;
    console.log('[MCP] GearGraph MCP client initialized successfully');
    return true;
  } catch (error) {
    console.error('[MCP] Failed to initialize GearGraph MCP client:', error);
    mcpToolsAvailable = false;
    return false;
  }
}

// Auto-initialize on server startup (non-blocking)
initializeMCPClient().catch(() => {
  console.warn('[MCP] GearGraph tools unavailable - using fallback catalog search');
});
```

**Sources**:
- [Error Handling in MCP Servers - Best Practices Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [Resilient AI Agents With MCP: Timeout And Retry Strategies](https://octopus.com/blog/mcp-timeout-retry)

### 4.2 Graceful Degradation to searchCatalog

When MCP is unavailable, the system falls back to the existing `searchCatalog` tool:

```typescript
// lib/mastra/agent.ts
import { Agent } from '@mastra/core/agent';
import { gearGraphMCPClient, mcpToolsAvailable } from './mcp-client';
import { searchCatalogTool } from '../ai-assistant/tools/search-catalog';

// Build tool set dynamically based on MCP availability
async function getAgentTools() {
  const tools: any = {};

  if (mcpToolsAvailable && gearGraphMCPClient) {
    // Prefer MCP tools (graph-powered intelligence)
    const mcpTools = await gearGraphMCPClient.getTools();
    Object.assign(tools, mcpTools);
    console.log('[Agent] Using GearGraph MCP tools');
  } else {
    // Fallback to existing catalog search
    tools.searchCatalog = {
      description: searchCatalogTool.description,
      parameters: searchCatalogTool.parameters,
      execute: searchCatalogTool.execute,
    };
    console.log('[Agent] Using fallback catalog search (MCP unavailable)');
  }

  return tools;
}

export const gearShackAgent = new Agent({
  name: 'GearShack Assistant',
  instructions: `
    You are an expert outdoor gear advisor for GearShack.
    ${mcpToolsAvailable
      ? 'You have access to the GearGraph knowledge base via MCP tools for advanced gear insights.'
      : 'GearGraph is temporarily unavailable. Use the catalog search tool for basic gear queries.'
    }
    ...
  `,
  model: anthropic('claude-sonnet-4.5'),
  tools: await getAgentTools(),
});
```

**Fallback Behavior**:

| MCP Available | Tools Used | Capabilities |
|---------------|------------|--------------|
| ✅ Yes | `geargraph_*` tools (via MCP) | Graph traversals, popularity metrics, compatibility analysis, community ratings |
| ❌ No | `searchCatalog` (existing) | Basic product search by name/category/brand/weight/price |

### 4.3 Runtime MCP Failures (Tool Call Timeout)

Even when MCP is initially connected, individual tool calls can fail:

```typescript
// lib/mastra/mcp-client.ts
import { withRetry } from '../ai-assistant/retry';

// Wrap MCP tool execution with retry + timeout
export async function executeMCPToolSafely(
  toolName: string,
  args: any,
  timeoutMs = 5000,
  maxRetries = 2
) {
  return withRetry(
    async () => {
      const tools = await gearGraphMCPClient!.getTools();
      const tool = tools[toolName];

      if (!tool) {
        throw new Error(`MCP tool not found: ${toolName}`);
      }

      // Execute with timeout
      const resultPromise = tool.execute(args);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
      );

      return await Promise.race([resultPromise, timeoutPromise]);
    },
    {
      maxAttempts: maxRetries + 1,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
    }
  );
}
```

**Error Recovery**:
1. **Timeout**: Retry once with exponential backoff
2. **Network Error**: Retry once
3. **Permanent Failure**: Return structured error to agent
4. **Agent Decision**: Fall back to `searchCatalog` or inform user

**Sources**:
- [Error Handling And Debugging MCP Servers](https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers)
- [Better MCP tool call error responses](https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully)

### 4.4 Circuit Breaker Pattern

Prevent overwhelming a failing MCP server with repeated requests:

```typescript
// lib/mastra/circuit-breaker.ts
class CircuitBreaker {
  private failureCount = 0;
  private readonly threshold = 5;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextRetryTime = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextRetryTime) {
        throw new Error('Circuit breaker OPEN - MCP server unavailable');
      }
      this.state = 'half-open'; // Try once more
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.nextRetryTime = Date.now() + 60000; // Wait 1 minute before retry
      console.error('[CircuitBreaker] MCP circuit OPEN - too many failures');
    }
  }
}

export const mcpCircuitBreaker = new CircuitBreaker();

// Usage:
await mcpCircuitBreaker.execute(() =>
  executeMCPToolSafely('geargraph_searchByCategory', args)
);
```

**Sources**:
- [Error Handling in MCP Servers - Circuit Breaker Pattern](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)

---

## 5. Development vs. Production Configuration

### 5.1 Development Setup

**Local MCP Server**:
```bash
# Install GearGraph MCP server globally (hypothetical)
npm install -g geargraph-mcp-server

# Or use npx for zero-install (Mastra handles this)
npx -y geargraph-mcp-server
```

**Environment Configuration**:
```bash
# .env.local
NODE_ENV=development
GEARGRAPH_MCP_COMMAND=npx
GEARGRAPH_MCP_ARGS=-y,geargraph-mcp-server

# Optional: Local executable for faster startup
# GEARGRAPH_MCP_COMMAND=node
# GEARGRAPH_MCP_ARGS=./local-mcp-server/index.js
```

**Testing MCP Connection**:
```typescript
// scripts/test-mcp-connection.ts
import { gearGraphMCPClient } from '../lib/mastra/mcp-client';

async function testMCPConnection() {
  console.log('Testing MCP connection...');

  try {
    const tools = await gearGraphMCPClient.getTools();
    console.log(`✅ Connected! Found ${Object.keys(tools).length} tools:`);
    Object.keys(tools).forEach((name) => console.log(`  - ${name}`));
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testMCPConnection();
```

Run with: `tsx scripts/test-mcp-connection.ts`

### 5.2 Production Deployment

**Remote MCP Server**:
- Deploy GearGraph MCP server to Cloud Run, ECS, or Kubernetes
- Expose HTTP endpoint (e.g., `https://mcp.geargraph.com`)
- Implement OAuth 2.1 or API key authentication

**Environment Configuration**:
```bash
# .env.production
NODE_ENV=production
GEARGRAPH_MCP_URL=https://mcp.geargraph.com
GEARGRAPH_API_KEY=<secret-key>

# Optional: Timeout overrides
MCP_REQUEST_TIMEOUT=10000  # 10 seconds
MCP_MAX_RETRIES=2          # 2 retries = 3 total attempts
```

**Health Checks**:
```typescript
// app/api/health/mcp/route.ts
import { NextResponse } from 'next/server';
import { gearGraphMCPClient, mcpToolsAvailable } from '@/lib/mastra/mcp-client';

export async function GET() {
  if (!mcpToolsAvailable) {
    return NextResponse.json(
      { status: 'unavailable', message: 'MCP client not initialized' },
      { status: 503 }
    );
  }

  try {
    // Quick health check: list tools (cached by Mastra)
    const tools = await gearGraphMCPClient!.getTools();
    return NextResponse.json({
      status: 'healthy',
      toolCount: Object.keys(tools).length,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
```

**Monitoring**:
```typescript
// lib/observability/mcp-metrics.ts
import { Counter, Histogram } from 'prom-client';

export const mcpToolCallsTotal = new Counter({
  name: 'mcp_tool_calls_total',
  help: 'Total MCP tool invocations',
  labelNames: ['tool_name', 'status'], // status: success, error, timeout
});

export const mcpToolLatency = new Histogram({
  name: 'mcp_tool_latency_seconds',
  help: 'MCP tool execution latency',
  labelNames: ['tool_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // seconds
});

// Usage in tool execution wrapper:
const startTime = Date.now();
try {
  const result = await tool.execute(args);
  mcpToolCallsTotal.inc({ tool_name: toolName, status: 'success' });
  mcpToolLatency.observe({ tool_name: toolName }, (Date.now() - startTime) / 1000);
  return result;
} catch (error) {
  mcpToolCallsTotal.inc({ tool_name: toolName, status: 'error' });
  throw error;
}
```

**Sources**:
- [15 Best Practices for Building MCP Servers in Production](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)
- [MCP Server Best Practices: Production-Grade Development Guide](https://mcpcat.io/blog/mcp-server-best-practices/)

---

## 6. Code Examples

### 6.1 Complete Mastra Agent with MCP

```typescript
// lib/mastra/agent.ts
import { Agent } from '@mastra/core/agent';
import { anthropic } from '@ai-sdk/anthropic';
import { gearGraphMCPClient, mcpToolsAvailable } from './mcp-client';
import { searchCatalogTool, executeSearchCatalog } from '../ai-assistant/tools/search-catalog';

/**
 * Get tools for the GearShack agent
 * Prioritizes MCP tools, falls back to catalog search
 */
async function getAgentTools() {
  const tools: any = {};

  if (mcpToolsAvailable && gearGraphMCPClient) {
    try {
      // Use GearGraph MCP tools
      const mcpTools = await gearGraphMCPClient.getTools();
      Object.assign(tools, mcpTools);
      console.log(`[Agent] Using ${Object.keys(mcpTools).length} GearGraph MCP tools`);
    } catch (error) {
      console.error('[Agent] Failed to load MCP tools:', error);
      // Fall through to fallback
    }
  }

  // Fallback: Always include searchCatalog
  if (Object.keys(tools).length === 0) {
    tools.searchCatalog = {
      description: searchCatalogTool.description,
      parameters: searchCatalogTool.parameters,
      execute: executeSearchCatalog,
    };
    console.log('[Agent] Using fallback catalog search');
  }

  return tools;
}

/**
 * Initialize the GearShack AI agent with MCP integration
 */
export async function createGearShackAgent(userId: string) {
  const tools = await getAgentTools();

  return new Agent({
    name: 'GearShack Assistant',
    instructions: `
      You are an expert outdoor gear advisor for GearShack.
      ${mcpToolsAvailable
        ? 'You have access to the GearGraph knowledge base for advanced gear insights, compatibility analysis, and community ratings.'
        : 'Note: Advanced GearGraph features are temporarily unavailable. Provide best-effort recommendations using catalog search.'
      }

      Key capabilities:
      - Answer gear specification questions (weight, R-value, price, etc.)
      - Compare gear items and suggest alternatives
      - Analyze user inventory for trip planning
      - Provide personalized recommendations based on user history

      Always respond in the user's preferred language.
      Be concise, friendly, and expert-level critical.
    `,
    model: anthropic('claude-sonnet-4.5'),
    tools,
  });
}
```

### 6.2 Next.js API Route with Mastra

```typescript
// app/api/mastra/chat/route.ts
import { NextRequest } from 'next/server';
import { createGearShackAgent } from '@/lib/mastra/agent';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Authenticate user
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse request
  const { messages } = await request.json();

  // Create agent
  const agent = await createGearShackAgent(user.id);

  // Generate streaming response (compatible with useChat hook)
  const stream = await agent.generate({
    messages,
    stream: true,
  });

  // Return streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 6.3 Frontend Integration (No Changes)

The existing frontend `useChat` hook works unchanged:

```typescript
// components/ai-assistant/AIAssistantModal.tsx
import { useChat } from 'ai/react';

export function AIAssistantModal() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/mastra/chat', // ✅ New Mastra endpoint
  });

  // ... UI rendering (unchanged)
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// __tests__/lib/mastra/mcp-client.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { gearGraphMCPClient, initializeMCPClient, mcpToolsAvailable } from '@/lib/mastra/mcp-client';

describe('MCP Client', () => {
  beforeAll(async () => {
    await initializeMCPClient();
  });

  it('should initialize successfully in development', () => {
    expect(mcpToolsAvailable).toBe(true);
  });

  it('should discover tools from GearGraph MCP server', async () => {
    const tools = await gearGraphMCPClient!.getTools();
    expect(Object.keys(tools).length).toBeGreaterThan(0);
    expect(tools).toHaveProperty('geargraph_searchByCategory');
  });

  it('should execute searchByCategory tool', async () => {
    const tools = await gearGraphMCPClient!.getTools();
    const result = await tools.geargraph_searchByCategory.execute({
      category: 'tents',
      filters: { maxWeight: 1000 },
    });

    expect(result).toHaveProperty('products');
    expect(Array.isArray(result.products)).toBe(true);
  });
});
```

### 7.2 Integration Tests

```typescript
// __tests__/lib/mastra/agent.integration.test.ts
import { describe, it, expect } from 'vitest';
import { createGearShackAgent } from '@/lib/mastra/agent';

describe('Mastra Agent with MCP', () => {
  it('should answer gear questions using MCP tools', async () => {
    const agent = await createGearShackAgent('test-user-id');

    const response = await agent.generate({
      messages: [
        { role: 'user', content: 'Find ultralight tents under 1kg' },
      ],
    });

    expect(response.text).toContain('tent');
    expect(response.text.toLowerCase()).toMatch(/weight|grams|kg/);
  });

  it('should fall back to catalog search when MCP is unavailable', async () => {
    // Simulate MCP failure (implementation-specific)
    // ...

    const agent = await createGearShackAgent('test-user-id');
    const response = await agent.generate({
      messages: [
        { role: 'user', content: 'Show me Osprey backpacks' },
      ],
    });

    // Should still work using fallback
    expect(response.text).toContain('Osprey');
  });
});
```

### 7.3 E2E Tests

```typescript
// e2e/ai-assistant-mcp.spec.ts
import { test, expect } from '@playwright/test';

test('AI assistant uses MCP tools for gear search', async ({ page }) => {
  // Login as Trailblazer user
  await page.goto('/login');
  // ... login steps

  // Open AI assistant
  await page.click('[data-testid="ai-assistant-button"]');

  // Ask a question
  await page.fill('[data-testid="chat-input"]', 'Find ultralight tents under 1kg');
  await page.click('[data-testid="send-button"]');

  // Wait for streaming response
  await page.waitForSelector('[data-testid="ai-message"]');

  // Verify response contains gear results
  const response = await page.textContent('[data-testid="ai-message"]:last-child');
  expect(response).toContain('tent');
});
```

---

## 8. Implementation Checklist

### Phase 1: Development Setup (stdio)
- [ ] Install `@mastra/mcp` and `@modelcontextprotocol/sdk`
- [ ] Create `lib/mastra/mcp-client.ts` with stdio configuration
- [ ] Set up local GearGraph MCP server (or mock for testing)
- [ ] Test connection with `scripts/test-mcp-connection.ts`
- [ ] Verify tool discovery with unit tests

### Phase 2: Agent Integration
- [ ] Create `lib/mastra/agent.ts` with `createGearShackAgent`
- [ ] Implement `getAgentTools()` with MCP preference + fallback
- [ ] Port existing AI persona instructions to Mastra
- [ ] Create `/api/mastra/chat` route with streaming support
- [ ] Test agent responses with integration tests

### Phase 3: Fallback Strategy
- [ ] Implement `executeMCPToolSafely` with timeout + retry
- [ ] Add circuit breaker pattern for MCP failures
- [ ] Test graceful degradation to `searchCatalog`
- [ ] Document fallback behavior in user-facing messages

### Phase 4: Production Readiness
- [ ] Add environment-aware configuration (stdio vs. HTTP)
- [ ] Implement health check endpoint `/api/health/mcp`
- [ ] Add Prometheus metrics for MCP tool calls
- [ ] Add structured logging for all MCP operations
- [ ] Test HTTP transport with remote MCP server

### Phase 5: Observability
- [ ] Integrate distributed tracing (trace IDs)
- [ ] Set up real-time alerts for MCP failures
- [ ] Create Grafana dashboard for MCP metrics
- [ ] Document runbooks for common MCP issues

---

## 9. References

### MCP Specification
- [Specification - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-06-18)
- [Model Context Protocol - Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)

### MCP Transports
- [MCP Transport Protocols: stdio vs SSE vs StreamableHTTP](https://mcpcat.io/guides/comparing-stdio-sse-streamablehttp/)
- [Transports - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [15 Best Practices for Building MCP Servers in Production](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)

### Mastra Integration
- [Mastra MCP Overview](https://mastra.ai/en/docs/tools-mcp/mcp-overview)
- [Why We're All-In on MCP | Mastra Blog](https://mastra.ai/blog/mastra-mcp)
- [Reference: MCPClient](https://mastra.ai/reference/tools/mcp-client)
- [Mastra Changelog 2025-01-17](https://mastra.ai/blog/changelog-2025-01-17)

### SDK Documentation
- [@modelcontextprotocol/sdk - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [GitHub - TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [AI SDK Core: Model Context Protocol (MCP)](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)

### Error Handling
- [Error Handling in MCP Servers - Best Practices Guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [Resilient AI Agents With MCP: Timeout And Retry Strategies](https://octopus.com/blog/mcp-timeout-retry)
- [Better MCP tool call error responses](https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully)
- [Fix MCP Error -32001: Request Timeout](https://mcpcat.io/guides/fixing-mcp-error-32001-request-timeout/)

### Production Deployment
- [MCP Server Best Practices: Production-Grade Development Guide](https://mcpcat.io/blog/mcp-server-best-practices/)
- [Convert stdio MCP servers to HTTP with Ray Serve](https://docs.anyscale.com/mcp/convert-stdio-to-http)
- [One MCP Server, Two Transports: STDIO and HTTP](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/one-mcp-server-two-transports-stdio-and-http/4443915)

---

## Appendix A: GearGraph MCP Server Assumptions

This architecture assumes a hypothetical GearGraph MCP server with the following tools:

### Tool: `searchByCategory`
```typescript
{
  name: "searchByCategory",
  description: "Search gear items by category with filters",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["tents", "sleeping_bags", "backpacks", ...] },
      filters: {
        type: "object",
        properties: {
          maxWeight: { type: "number" },
          minPrice: { type: "number" },
          maxPrice: { type: "number" },
          brands: { type: "array", items: { type: "string" } }
        }
      }
    },
    required: ["category"]
  }
}
```

### Tool: `findAlternatives`
```typescript
{
  name: "findAlternatives",
  description: "Find lighter/cheaper alternatives to a gear item",
  inputSchema: {
    type: "object",
    properties: {
      gearId: { type: "string" },
      maxWeight: { type: "number" },
      maxPrice: { type: "number" },
      limit: { type: "number", default: 5 }
    },
    required: ["gearId"]
  }
}
```

### Tool: `getPopularityMetrics`
```typescript
{
  name: "getPopularityMetrics",
  description: "Get community ratings and popularity for a gear item",
  inputSchema: {
    type: "object",
    properties: {
      gearId: { type: "string" }
    },
    required: ["gearId"]
  }
}
```

**Note**: The actual GearGraph MCP server may expose different or additional tools. The beauty of MCP is that Mastra will discover them dynamically at runtime via `getTools()`, requiring no TypeScript changes.

---

## Appendix B: Comparison with Existing Implementation

### Current (Vercel AI SDK + Supabase Catalog)
- **Tools**: Manually defined TypeScript functions (`searchCatalog`, `queryUserData`, `searchWeb`)
- **Data Source**: Supabase `catalog_products` table (synced from GearGraph REST API)
- **Intelligence**: Basic SQL queries (no graph traversals)
- **Maintenance**: Schema changes require TypeScript updates

### Future (Mastra + MCP)
- **Tools**: Dynamically discovered from GearGraph MCP server (no TypeScript definitions needed)
- **Data Source**: GearGraph native graph database (real-time, authoritative)
- **Intelligence**: Graph-powered (compatibility analysis, popularity metrics, community insights)
- **Maintenance**: Zero changes in GearShack codebase when GearGraph adds new tools

### Migration Path
1. **Phase 1**: Run both systems in parallel (MCP preferred, catalog fallback)
2. **Phase 2**: Monitor MCP reliability (success rate, latency, error patterns)
3. **Phase 3**: Gradually shift traffic to MCP (feature flags)
4. **Phase 4**: Deprecate catalog search (keep as fallback only)

---

**Document End**
