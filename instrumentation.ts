import * as Sentry from '@sentry/nextjs';
import { validateEnv } from './lib/env';

export async function register() {
  // Validate environment variables at startup
  try {
    validateEnv();
    console.log('[Instrumentation] Environment validation passed');
  } catch (error) {
    console.error('[Instrumentation] Environment validation failed:', error);
    throw error;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for error tracking
    await import('./sentry.server.config');

    // Initialize OpenTelemetry for Mastra distributed tracing (Feature 051)
    // Note: OpenTelemetry instrumentation is configured in lib/mastra/tracing.ts
    console.log('[Instrumentation] Mastra OpenTelemetry tracing enabled (Node.js runtime)');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
