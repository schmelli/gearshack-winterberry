/**
 * GearShack MCP Server — HTTP Endpoint
 * Feature: 060-ai-agent-evolution — Vorschlag 8 (Kap. 11)
 *
 * Exposes GearShack as an MCP-compatible tool server over HTTP.
 * External agents (Claude.ai, Cursor, personal assistants) can connect
 * to this endpoint to analyze loadouts, search gear, and get insights.
 *
 * Protocol: JSON-RPC 2.0 over HTTP POST
 * Auth: API key via X-API-Key header (MCP_SERVER_API_KEY env var)
 *
 * POST /api/mcp — Handle MCP JSON-RPC requests
 * GET  /api/mcp — Server info and health check
 *
 * @see https://modelcontextprotocol.io/specification
 */

import { NextResponse } from 'next/server';
import { handleMCPRequest, type JSONRPCRequest } from '@/lib/mastra/mcp-server';

// ============================================================================
// Auth
// ============================================================================

function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.MCP_SERVER_API_KEY;

  if (!expectedKey) {
    console.warn('[MCP API] MCP_SERVER_API_KEY not configured — MCP server disabled');
    return false;
  }

  return apiKey === expectedKey;
}

// ============================================================================
// POST — MCP JSON-RPC Handler
// ============================================================================

export async function POST(request: Request) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: 'Unauthorized: invalid or missing API key' },
      },
      { status: 401 }
    );
  }

  // Parse request body
  let body: JSONRPCRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON' },
      },
      { status: 400 }
    );
  }

  // Validate JSON-RPC structure
  if (!body.method || body.jsonrpc !== '2.0') {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32600, message: 'Invalid request: must include jsonrpc "2.0" and method' },
      },
      { status: 400 }
    );
  }

  // Handle the MCP request
  const response = await handleMCPRequest(body);

  // Notifications return null (no response needed)
  if (response === null) {
    return new Response(null, { status: 204 });
  }

  return NextResponse.json(response);
}

// ============================================================================
// GET — Server Info / Health Check
// ============================================================================

export async function GET() {
  const isConfigured = !!process.env.MCP_SERVER_API_KEY;

  return NextResponse.json({
    server: 'gearshack',
    version: '1.0.0',
    protocol: 'MCP (Model Context Protocol)',
    protocolVersion: '2024-11-05',
    status: isConfigured ? 'active' : 'unconfigured',
    tools: ['analyzeLoadout', 'searchGear', 'inventoryInsights'],
    documentation: 'Authenticate with X-API-Key header. Send JSON-RPC 2.0 POST requests.',
  });
}
