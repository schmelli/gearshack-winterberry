/**
 * Central Mastra Instance — Mastra Studio Entry Point
 *
 * This file is the required entry point for `npx mastra dev`, which starts
 * the Mastra Studio local development server at http://localhost:4111.
 *
 * Studio features enabled:
 *   - Agent Chat Interface — interact with the Gear Assistant
 *   - Tool Playground — test individual tools (searchGear, analyzeLoadout, etc.)
 *   - Workflow Visualizer — inspect agent decision flows
 *   - Tracing UI — full OpenTelemetry traces for every interaction
 *
 * Usage:
 *   npx mastra dev          # Start Studio at http://localhost:4111
 *   npm run mastra:dev      # Same, via npm script
 *
 * Production Note:
 *   The Next.js API routes (`app/api/mastra/chat/route.ts`) continue to use
 *   the per-request `createGearAgent()` from `lib/mastra/mastra-agent.ts`.
 *   This central instance is exclusively for local Studio development.
 *
 * @see https://mastra.ai/docs/local-dev/mastra-dev
 * @see lib/mastra/mastra-agent.ts — Production per-request agent factory
 */

import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';

import { getGearAssistant } from './agents/gear-assistant';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const VALID_LOG_LEVELS = ['info', 'debug', 'warn', 'error'] as const;
type LogLevel = (typeof VALID_LOG_LEVELS)[number];

function getLogLevel(): LogLevel {
  const level = process.env.MASTRA_LOG_LEVEL;
  if (level && (VALID_LOG_LEVELS as readonly string[]).includes(level)) {
    return level as LogLevel;
  }
  return 'info';
}

const logger = createLogger({
  name: 'gearshack-ai',
  level: getLogLevel(),
});

// ---------------------------------------------------------------------------
// Agent Initialization
//
// Agent creation is lazy inside getGearAssistant(), but we call it here so
// that startup errors (missing AI_GATEWAY_API_KEY, etc.) are surfaced with a
// clear message rather than a bare stack trace inside the Studio UI.
// ---------------------------------------------------------------------------

function initAgent() {
  try {
    return getGearAssistant();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[Mastra Studio] Failed to initialize Gear Assistant:\n  ${msg}\n`);
    console.error('  → Ensure AI_GATEWAY_API_KEY (or AI_GATEWAY_KEY) is set in .env.local\n');
    process.exit(1);
  }
}

const gearAssistant = initAgent();

// ---------------------------------------------------------------------------
// Central Mastra Instance
//
// Note: storage/vectors are intentionally omitted at the Mastra level.
// The agent's Memory instance already owns its own PgStore and PgVector —
// adding them here too would open redundant database connections.
// ---------------------------------------------------------------------------

export const mastra = new Mastra({
  agents: {
    gearAssistant,
  },
  logger,
  server: {
    // Number('') → NaN, NaN || 4111 falls back correctly; invalid strings are silently ignored
    port: Number(process.env.MASTRA_STUDIO_PORT) || 4111,
  },
});
