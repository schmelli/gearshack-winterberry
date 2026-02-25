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
import { PgVector, PostgresStore } from '@mastra/pg';

import { gearAssistant } from './agents/gear-assistant';

// ---------------------------------------------------------------------------
// Shared Storage (optional — only when DATABASE_URL is available)
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

const storage = DATABASE_URL
  ? new PostgresStore({
      id: 'gearshack-mastra-storage',
      connectionString: DATABASE_URL,
    })
  : undefined;

const vectors = DATABASE_URL
  ? {
      pgVector: new PgVector({
        id: 'gearshack-mastra-vector',
        connectionString: DATABASE_URL,
      }),
    }
  : undefined;

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger({
  name: 'gearshack-ai',
  level: (process.env.MASTRA_LOG_LEVEL as 'info' | 'debug' | 'warn' | 'error') || 'info',
});

// ---------------------------------------------------------------------------
// Central Mastra Instance
// ---------------------------------------------------------------------------

export const mastra = new Mastra({
  agents: {
    gearAssistant,
  },
  storage,
  vectors,
  logger,
  server: {
    port: 4111,
  },
});
