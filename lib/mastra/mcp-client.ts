/**
 * MCP Client Wrapper for GearGraph MCP Server
 * Feature: 001-mastra-agentic-voice
 * Task: T056 [US3] - MCP client wrapper (stdio for dev, HTTP for prod)
 * Task: T057 [US3] - Tool discovery with in-memory caching (5-minute TTL)
 *
 * Provides a unified MCP client that supports both stdio (development) and
 * HTTP (production) transports. Implements connection management, tool discovery
 * with caching, graceful error handling with 5-second timeout, and periodic
 * cache refresh.
 *
 * Environment variables:
 * - MCP_TRANSPORT: 'stdio' | 'http' (default: 'http')
 * - MCP_SERVER_URL: HTTP endpoint for production (default: 'http://localhost:8080')
 * - MCP_TOOL_CACHE_TTL_MS: Tool cache TTL in ms (default: 300000 = 5 minutes)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { MCPTool, MCPConnectionStatus, MCPToolResult } from '@/types/mastra';
import { logInfo, logError, logDebug, createTimer } from './logging';

// ============================================================================
// Types
// ============================================================================

/**
 * MCP transport type
 */
export type MCPTransportType = 'stdio' | 'http';

/**
 * Configuration for MCP client
 */
export interface MCPClientConfig {
  transport: MCPTransportType;
  serverUrl: string;
  connectionTimeoutMs: number;
}

/**
 * Internal connection state
 */
interface ConnectionState {
  client: Client | null;
  transport: StdioClientTransport | SSEClientTransport | null;
  status: MCPConnectionStatus;
}

/**
 * Tool cache entry with TTL tracking
 * T057: Implements in-memory caching for discovered tools
 */
interface ToolCacheEntry {
  tools: MCPTool[];
  cachedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: MCPClientConfig = {
  transport: 'http',
  serverUrl: 'http://localhost:8080',
  connectionTimeoutMs: 5000,
};

const CLIENT_INFO = {
  name: 'gearshack-mastra',
  version: '1.0.0',
};

/** T057: Default tool cache TTL of 5 minutes */
const DEFAULT_TOOL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Default tool call timeout - configurable via MCP_TOOL_TIMEOUT_MS env var */
const DEFAULT_TOOL_CALL_TIMEOUT_MS = parseInt(
  process.env.MCP_TOOL_TIMEOUT_MS || '5000',
  10
);

/**
 * MCP Client capabilities for SDK v1.25+
 * Using minimal capabilities required for tool discovery and execution.
 */
interface MCPClientCapabilities {
  experimental?: Record<string, object>;
  sampling?: Record<string, object>;
}

// ============================================================================
// MCPClient Class
// ============================================================================

/**
 * MCPClient provides a unified interface for connecting to MCP servers
 * using either stdio or HTTP transport.
 *
 * @example
 * ```typescript
 * import { mcpClient } from '@/lib/mastra/mcp-client';
 *
 * // Connect to MCP server
 * await mcpClient.connect();
 *
 * // List available tools
 * const tools = await mcpClient.listTools();
 *
 * // Check connection status
 * const status = mcpClient.getStatus();
 *
 * // Disconnect when done
 * await mcpClient.disconnect();
 * ```
 */
export class MCPClient {
  private config: MCPClientConfig;
  private state: ConnectionState;

  /** T057: In-memory tool cache with TTL */
  private toolCache: ToolCacheEntry | null = null;
  private toolCacheTtlMs: number;
  private cacheRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<MCPClientConfig>) {
    this.config = this.resolveConfig(config);
    this.state = {
      client: null,
      transport: null,
      status: this.createInitialStatus(),
    };

    // T057: Initialize cache TTL from environment or default
    this.toolCacheTtlMs = parseInt(
      process.env.MCP_TOOL_CACHE_TTL_MS || String(DEFAULT_TOOL_CACHE_TTL_MS),
      10
    );
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Connect to the MCP server.
   *
   * Creates a connection using the configured transport (stdio or HTTP).
   * Implements a 5-second connection timeout for graceful error handling.
   *
   * @throws MCPConnectionError if connection fails or times out
   */
  async connect(): Promise<void> {
    if (this.state.client) {
      logDebug('MCP client already connected, skipping reconnection');
      return;
    }

    const getElapsed = createTimer();

    logInfo('Connecting to MCP server', {
      metadata: {
        transport: this.config.transport,
        serverUrl: this.config.serverUrl,
      },
    });

    try {
      // Create transport based on configuration
      const transport = await this.createTransport();
      this.state.transport = transport;

      // Create MCP client with typed capabilities
      // ClientCapabilities in @modelcontextprotocol/sdk v1.25+ supports
      // experimental, sampling, elicitation, roots, and tasks properties.
      const clientCapabilities: MCPClientCapabilities = {
        experimental: {},
        sampling: {},
      };
      const client = new Client(CLIENT_INFO, {
        capabilities: clientCapabilities,
      });

      // Connect with timeout
      await this.connectWithTimeout(client, transport);

      this.state.client = client;
      this.state.status = {
        connected: true,
        serverUrl: this.config.serverUrl,
        transport: this.config.transport,
        discoveredTools: [],
        lastPingAt: new Date(),
        error: null,
      };

      const latencyMs = getElapsed();
      logInfo('MCP server connected successfully', {
        metadata: { latencyMs, transport: this.config.transport },
      });
    } catch (error) {
      const latencyMs = getElapsed();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.state.status = {
        ...this.state.status,
        connected: false,
        error: errorMessage,
      };

      logError('Failed to connect to MCP server', error, {
        metadata: { latencyMs, transport: this.config.transport },
      });

      throw new MCPConnectionError(
        `Failed to connect to MCP server: ${errorMessage}`,
        'CONNECTION_FAILED',
        { transport: this.config.transport, serverUrl: this.config.serverUrl }
      );
    }
  }

  /**
   * Disconnect from the MCP server.
   *
   * Closes the connection and cleans up resources.
   * Safe to call even if not connected.
   */
  async disconnect(): Promise<void> {
    // T057: Stop cache refresh timer
    this.stopCacheRefresh();

    if (!this.state.client) {
      logDebug('MCP client not connected, skipping disconnection');
      return;
    }

    logInfo('Disconnecting from MCP server');

    try {
      await this.state.client.close();
    } catch (error) {
      logError('Error during MCP client disconnection', error);
    } finally {
      this.state.client = null;
      this.state.transport = null;
      this.state.status = {
        ...this.state.status,
        connected: false,
        discoveredTools: [],
        lastPingAt: null,
      };
      // T057: Clear tool cache on disconnect
      this.toolCache = null;

      logInfo('MCP server disconnected');
    }
  }

  /**
   * List all available tools from the MCP server.
   *
   * Discovers tools dynamically via the MCP listTools() API.
   * Updates the connection status with discovered tool names.
   *
   * @returns Array of MCPTool objects
   * @throws MCPConnectionError if not connected or request fails
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.state.client) {
      throw new MCPConnectionError(
        'MCP client not connected',
        'NOT_CONNECTED',
        {}
      );
    }

    const getElapsed = createTimer();

    logDebug('Listing MCP tools');

    try {
      const response = await this.state.client.listTools();
      const tools: MCPTool[] = response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? '',
        inputSchema: tool.inputSchema as Record<string, unknown>,
        transport: this.config.transport,
        endpoint:
          this.config.transport === 'http' ? this.config.serverUrl : undefined,
      }));

      // Update status with discovered tools
      this.state.status = {
        ...this.state.status,
        discoveredTools: tools.map((t) => t.name),
        lastPingAt: new Date(),
      };

      const latencyMs = getElapsed();
      logInfo('MCP tools discovered', {
        metadata: { toolCount: tools.length, latencyMs },
      });

      return tools;
    } catch (error) {
      const latencyMs = getElapsed();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logError('Failed to list MCP tools', error, {
        metadata: { latencyMs },
      });

      throw new MCPConnectionError(
        `Failed to list MCP tools: ${errorMessage}`,
        'LIST_TOOLS_FAILED',
        {}
      );
    }
  }

  /**
   * T057: Discover available tools from the MCP server with caching.
   *
   * This method implements the following behavior:
   * 1. Check if cached tools exist and are not expired
   * 2. If cache is valid, return cached tools immediately
   * 3. If cache is expired or doesn't exist, call listTools() API
   * 4. Cache the result with a 5-minute TTL (configurable via MCP_TOOL_CACHE_TTL_MS)
   * 5. Start periodic cache refresh if not already running
   * 6. If MCP server is unavailable, return empty array (graceful degradation)
   *
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   * @returns Array of MCPTool objects, or empty array if server unavailable
   */
  async discoverTools(forceRefresh = false): Promise<MCPTool[]> {
    // Check cache first (unless force refresh)
    if (!forceRefresh && this.isCacheValid()) {
      logDebug('Returning cached MCP tools', {
        metadata: {
          toolCount: this.toolCache!.tools.length,
          cachedAt: this.toolCache!.cachedAt.toISOString(),
          expiresAt: this.toolCache!.expiresAt.toISOString(),
        },
      });
      return this.toolCache!.tools;
    }

    // Try to connect and fetch fresh tools
    try {
      // Ensure connection
      if (!this.state.client) {
        await this.connect();
      }

      // Fetch fresh tools from server
      const tools = await this.listTools();

      // Update cache
      const now = new Date();
      this.toolCache = {
        tools,
        cachedAt: now,
        expiresAt: new Date(now.getTime() + this.toolCacheTtlMs),
      };

      logInfo('Tool cache updated', {
        metadata: {
          toolCount: tools.length,
          ttlMs: this.toolCacheTtlMs,
          expiresAt: this.toolCache.expiresAt.toISOString(),
        },
      });

      // Start periodic cache refresh if not already running
      this.startCacheRefresh();

      return tools;
    } catch (error) {
      // Graceful degradation: return stale cache or empty array
      logError('Failed to discover tools, using fallback', error);

      // Return stale cache if available
      if (this.toolCache) {
        logDebug('Returning stale cached tools as fallback', {
          metadata: {
            toolCount: this.toolCache.tools.length,
            staleSince: this.toolCache.expiresAt.toISOString(),
          },
        });
        return this.toolCache.tools;
      }

      // No cache available, return empty array
      logDebug('No cached tools available, returning empty array');
      return [];
    }
  }

  /**
   * T057: Get cache status for monitoring/debugging.
   *
   * @returns Object with cache metadata
   */
  getCacheStatus(): {
    isCached: boolean;
    toolCount: number;
    cachedAt: Date | null;
    expiresAt: Date | null;
    isExpired: boolean;
    ttlMs: number;
  } {
    return {
      isCached: this.toolCache !== null,
      toolCount: this.toolCache?.tools.length ?? 0,
      cachedAt: this.toolCache?.cachedAt ?? null,
      expiresAt: this.toolCache?.expiresAt ?? null,
      isExpired: !this.isCacheValid(),
      ttlMs: this.toolCacheTtlMs,
    };
  }

  /**
   * Get the current connection status.
   *
   * @returns MCPConnectionStatus object
   */
  getStatus(): MCPConnectionStatus {
    return { ...this.state.status };
  }

  /**
   * Check if the client is currently connected.
   *
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.state.status.connected;
  }

  /**
   * Get the underlying MCP client for advanced operations.
   *
   * @returns MCP Client instance or null if not connected
   */
  getClient(): Client | null {
    return this.state.client;
  }

  /**
   * Call a tool on the MCP server.
   *
   * Executes a tool with the given arguments and returns a standardized result.
   * Implements timeout handling for graceful error handling.
   * Timeout is configurable via MCP_TOOL_TIMEOUT_MS env var (default: 5000ms).
   *
   * @param toolName - Name of the tool to call
   * @param args - Arguments to pass to the tool
   * @param timeoutMs - Timeout in milliseconds (default: from env or 5000)
   * @returns MCPToolResult with result or error
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    timeoutMs: number = DEFAULT_TOOL_CALL_TIMEOUT_MS
  ): Promise<MCPToolResult> {
    const getElapsed = createTimer();

    // Ensure connected
    if (!this.state.client) {
      try {
        await this.connect();
      } catch {
        return {
          toolName,
          result: null,
          latencyMs: getElapsed(),
          error: 'MCP client not connected and connection failed',
        };
      }
    }

    logDebug('Calling MCP tool', {
      metadata: { toolName, argsKeys: Object.keys(args) },
    });

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`MCP tool call timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      );

      // Execute tool call with timeout
      const callPromise = this.state.client!.callTool({
        name: toolName,
        arguments: args,
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      const latencyMs = getElapsed();

      // Extract result content
      const content = response.content;
      let result: unknown = null;

      if (Array.isArray(content) && content.length > 0) {
        const firstItem = content[0];
        if ('text' in firstItem && typeof firstItem.text === 'string') {
          // Try to parse JSON result
          try {
            result = JSON.parse(firstItem.text);
          } catch {
            result = firstItem.text;
          }
        } else {
          result = content;
        }
      }

      // Check for error in response
      if (response.isError) {
        logError('MCP tool returned error', { toolName, result }, {
          metadata: { latencyMs },
        });
        return {
          toolName,
          result: null,
          latencyMs,
          error: typeof result === 'string' ? result : 'Tool execution failed',
        };
      }

      // Update last ping time
      this.state.status = {
        ...this.state.status,
        lastPingAt: new Date(),
      };

      logInfo('MCP tool call completed', {
        metadata: { toolName, latencyMs },
      });

      return {
        toolName,
        result,
        latencyMs,
        error: null,
      };
    } catch (error) {
      const latencyMs = getElapsed();
      const errorMessage = error instanceof Error ? error.message : String(error);

      logError('MCP tool call failed', error, {
        metadata: { toolName, latencyMs },
      });

      return {
        toolName,
        result: null,
        latencyMs,
        error: errorMessage,
      };
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Resolve configuration from environment variables and overrides
   */
  private resolveConfig(overrides?: Partial<MCPClientConfig>): MCPClientConfig {
    const transport =
      (process.env.MCP_TRANSPORT as MCPTransportType) ||
      overrides?.transport ||
      DEFAULT_CONFIG.transport;

    const serverUrl =
      process.env.MCP_SERVER_URL ||
      overrides?.serverUrl ||
      DEFAULT_CONFIG.serverUrl;

    const connectionTimeoutMs =
      overrides?.connectionTimeoutMs || DEFAULT_CONFIG.connectionTimeoutMs;

    return {
      transport,
      serverUrl,
      connectionTimeoutMs,
    };
  }

  /**
   * Create initial connection status
   */
  private createInitialStatus(): MCPConnectionStatus {
    return {
      connected: false,
      serverUrl: this.config.serverUrl,
      transport: this.config.transport,
      discoveredTools: [],
      lastPingAt: null,
      error: null,
    };
  }

  /**
   * Create transport based on configuration
   */
  private async createTransport(): Promise<
    StdioClientTransport | SSEClientTransport
  > {
    if (this.config.transport === 'stdio') {
      return this.createStdioTransport();
    } else {
      return this.createHttpTransport();
    }
  }

  /**
   * Create stdio transport for local development
   *
   * Security note: Environment variables are whitelisted and passed via the env object
   * rather than command-line arguments to prevent exposure in process listings.
   * Only necessary variables are passed to the subprocess to minimize attack surface.
   */
  private createStdioTransport(): StdioClientTransport {
    logDebug('Creating stdio transport');

    // Whitelist of environment variables allowed for MCP subprocess
    // Only include variables necessary for MCP server operation
    const whitelistedEnvVars: Record<string, string> = {
      // Node.js runtime
      NODE_ENV: process.env.NODE_ENV || 'development',
      // Supabase connection (required for GearGraph queries)
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      // Path variables (required for Node.js module resolution)
      PATH: process.env.PATH || '',
      HOME: process.env.HOME || '',
    };

    return new StdioClientTransport({
      command: 'node',
      args: [
        './scripts/geargraph-mcp-server.js',
        '--db',
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      ],
      env: whitelistedEnvVars,
    });
  }

  /**
   * Create HTTP transport for production using SSE
   */
  private createHttpTransport(): SSEClientTransport {
    logDebug('Creating HTTP/SSE transport', {
      metadata: { serverUrl: this.config.serverUrl },
    });

    const sseUrl = new URL('/sse', this.config.serverUrl);

    return new SSEClientTransport(sseUrl);
  }

  /**
   * T057: Check if the tool cache is valid (exists and not expired).
   *
   * @returns true if cache exists and has not expired
   */
  private isCacheValid(): boolean {
    if (!this.toolCache) {
      return false;
    }
    return Date.now() < this.toolCache.expiresAt.getTime();
  }

  /**
   * T057: Start periodic cache refresh.
   * Refreshes the cache at 80% of TTL to prevent cache misses.
   * Timer is unref'd to not block process exit.
   */
  private startCacheRefresh(): void {
    // Don't start if already running
    if (this.cacheRefreshTimer) {
      return;
    }

    // Refresh at 80% of TTL to prevent cache misses
    const refreshInterval = Math.floor(this.toolCacheTtlMs * 0.8);

    this.cacheRefreshTimer = setInterval(async () => {
      logDebug('Triggering periodic tool cache refresh');
      try {
        await this.discoverTools(true);
      } catch (error) {
        logError('Periodic tool cache refresh failed', error);
      }
    }, refreshInterval);

    // Don't block process exit
    if (this.cacheRefreshTimer.unref) {
      this.cacheRefreshTimer.unref();
    }

    logDebug('Cache refresh timer started', {
      metadata: { refreshIntervalMs: refreshInterval },
    });
  }

  /**
   * Stop the cache refresh timer.
   * T057: Called during disconnect to clean up resources.
   */
  private stopCacheRefresh(): void {
    if (this.cacheRefreshTimer) {
      clearInterval(this.cacheRefreshTimer);
      this.cacheRefreshTimer = null;
      logDebug('Cache refresh timer stopped');
    }
  }

  /**
   * Connect with timeout handling
   */
  private async connectWithTimeout(
    client: Client,
    transport: StdioClientTransport | SSEClientTransport
  ): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new MCPConnectionError(
            `Connection timeout after ${this.config.connectionTimeoutMs}ms`,
            'CONNECTION_TIMEOUT',
            { timeoutMs: this.config.connectionTimeoutMs }
          )
        );
      }, this.config.connectionTimeoutMs);
    });

    const connectPromise = client.connect(transport);

    await Promise.race([connectPromise, timeoutPromise]);
  }
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error class for MCP connection errors
 */
export class MCPConnectionError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPConnectionError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPConnectionError);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton MCP client instance for use across the application.
 *
 * @example
 * ```typescript
 * import { mcpClient } from '@/lib/mastra/mcp-client';
 *
 * // In API route or server action
 * await mcpClient.connect();
 * const tools = await mcpClient.listTools();
 * ```
 */
export const mcpClient = new MCPClient();

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function to create a new MCPClient instance with custom configuration.
 *
 * Use this when you need a separate client instance with different settings.
 *
 * @param config - Optional configuration overrides
 * @returns New MCPClient instance
 *
 * @example
 * ```typescript
 * import { createMCPClient } from '@/lib/mastra/mcp-client';
 *
 * const customClient = createMCPClient({
 *   transport: 'http',
 *   serverUrl: 'https://custom-mcp-server.example.com',
 *   connectionTimeoutMs: 10000,
 * });
 * ```
 */
export function createMCPClient(
  config?: Partial<MCPClientConfig>
): MCPClient {
  return new MCPClient(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default mcpClient;
