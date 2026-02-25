/**
 * Structured JSON Logging Module for Mastra AI System
 * Feature: T019 - Structured Logging with Pino
 * Feature: T020 - PII Sanitization Integration
 *
 * Provides structured JSON logging with context fields for observability.
 * All log entries include timestamp, level, and optional context fields
 * (userId, conversationId, workflowId, traceId).
 *
 * PII sanitization is automatically applied to all log messages and context
 * to ensure privacy compliance and data protection.
 */

import pino from 'pino';
import type { LogEntry } from '@/types/mastra';
import { sanitizePII } from './log-sanitizer';

// ==================== Type Definitions ====================

/**
 * Log context fields for structured logging
 */
export interface LogContext {
  userId?: string;
  conversationId?: string;
  workflowId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enabled: boolean;
  prettyPrint?: boolean;
}

// ==================== Configuration ====================

/**
 * Default logger configuration
 * Can be overridden via environment variables
 */
const getLoggerConfig = (): LoggerConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = (process.env.LOG_LEVEL as LoggerConfig['level']) || 'info';
  const loggingEnabled = process.env.LOGGING_ENABLED !== 'false';

  return {
    level: logLevel,
    enabled: loggingEnabled,
    prettyPrint: isDevelopment && process.env.LOG_PRETTY === 'true',
  };
};

// ==================== Pino Logger Instance ====================

const config = getLoggerConfig();

/**
 * Base Pino logger instance with JSON formatting
 * Configured for structured logging with Mastra context fields
 */
const baseLogger = pino({
  level: config.level,
  enabled: config.enabled,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  base: {
    service: 'gearshack-mastra',
    version: process.env.npm_package_version || '0.1.0',
  },
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
    ],
    censor: '[REDACTED]',
  },
});

// ==================== Context Management ====================

/**
 * Current async context for request-scoped logging
 * In Next.js, this is typically set per-request in middleware or API routes
 */
let currentContext: LogContext = {};

/**
 * Set the current logging context
 * Should be called at the start of each request/workflow
 */
export function setLogContext(context: LogContext): void {
  currentContext = { ...context };
}

/**
 * Get the current logging context
 */
export function getLogContext(): LogContext {
  return { ...currentContext };
}

/**
 * Clear the current logging context
 * Should be called at the end of each request/workflow
 */
export function clearLogContext(): void {
  currentContext = {};
}

/**
 * Create a child logger with additional context
 */
export function withContext(context: LogContext): pino.Logger {
  return baseLogger.child({
    ...currentContext,
    ...context,
  });
}

// ==================== Helper Functions ====================

/**
 * Sanitize data for logging (removes PII)
 * Applied to all messages and context before logging
 */
function sanitizeForLogging<T>(data: T): T {
  const result = sanitizePII(data, {
    sensitiveKeys: ['password', 'apiKey', 'secret', 'token', 'authorization'],
    preservePartial: false,
  });
  return result.sanitized as T;
}

/**
 * Merge context with current context and format for logging
 * Applies PII sanitization to all metadata
 */
function mergeContext(context?: LogContext): Record<string, unknown> {
  const merged = {
    ...currentContext,
    ...context,
  };

  const result: Record<string, unknown> = {};

  if (merged.userId) result.userId = merged.userId;
  if (merged.conversationId) result.conversationId = merged.conversationId;
  if (merged.workflowId) result.workflowId = merged.workflowId;
  if (merged.traceId) result.traceId = merged.traceId;
  // Sanitize metadata to remove any PII
  if (merged.metadata) result.metadata = sanitizeForLogging(merged.metadata);

  return result;
}

/**
 * Format error for structured logging
 */
function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...(error.cause ? { errorCause: formatError(error.cause) } : {}),
    };
  }
  return { errorMessage: String(error) };
}

// ==================== Logging Functions ====================

/**
 * Log an info-level message
 * Use for normal operational messages
 * PII is automatically sanitized from messages and context
 */
export function logInfo(
  message: string,
  context?: LogContext
): void {
  const ctx = mergeContext(context);
  const sanitizedMessage = sanitizeForLogging(message);
  baseLogger.info(ctx, sanitizedMessage);
}

/**
 * Log a debug-level message
 * Use for detailed debugging information
 * PII is automatically sanitized from messages and context
 */
export function logDebug(
  message: string,
  context?: LogContext
): void {
  const ctx = mergeContext(context);
  const sanitizedMessage = sanitizeForLogging(message);
  baseLogger.debug(ctx, sanitizedMessage);
}

/**
 * Log a warning-level message
 * Use for potentially problematic situations
 * PII is automatically sanitized from messages and context
 */
export function logWarn(
  message: string,
  context?: LogContext
): void {
  const ctx = mergeContext(context);
  const sanitizedMessage = sanitizeForLogging(message);
  baseLogger.warn(ctx, sanitizedMessage);
}

/**
 * Log an error-level message
 * Use for error conditions that need attention
 * PII is automatically sanitized from messages, errors, and context
 */
export function logError(
  message: string,
  error?: unknown,
  context?: LogContext
): void {
  const ctx = mergeContext(context);
  const sanitizedMessage = sanitizeForLogging(message);
  const errorDetails = error ? sanitizeForLogging(formatError(error)) : {};

  baseLogger.error({ ...ctx, ...errorDetails }, sanitizedMessage);
}

// ==================== Specialized Logging Functions ====================

/**
 * Log workflow step execution
 */
export function logWorkflowStep(
  workflowId: string,
  stepId: string,
  status: 'started' | 'completed' | 'failed',
  durationMs?: number,
  error?: unknown
): void {
  const context: LogContext = { workflowId };
  const stepInfo = {
    stepId,
    stepStatus: status,
    ...(durationMs !== undefined ? { durationMs } : {}),
  };

  if (status === 'failed' && error) {
    logError(`Workflow step ${stepId} failed`, error, {
      ...context,
      metadata: stepInfo,
    });
  } else {
    logInfo(`Workflow step ${stepId} ${status}`, {
      ...context,
      metadata: stepInfo,
    });
  }
}

/**
 * Log MCP tool execution
 */
export function logToolExecution(
  toolName: string,
  status: 'started' | 'completed' | 'failed',
  latencyMs?: number,
  error?: unknown,
  context?: LogContext
): void {
  const toolInfo = {
    toolName,
    toolStatus: status,
    ...(latencyMs !== undefined ? { latencyMs } : {}),
  };

  if (status === 'failed' && error) {
    logError(`Tool ${toolName} execution failed`, error, {
      ...context,
      metadata: toolInfo,
    });
  } else {
    logInfo(`Tool ${toolName} ${status}`, {
      ...context,
      metadata: toolInfo,
    });
  }
}

/**
 * Log rate limit events
 */
export function logRateLimit(
  userId: string,
  operationType: string,
  allowed: boolean,
  remaining?: number
): void {
  const message = allowed
    ? `Rate limit check passed for ${operationType}`
    : `Rate limit exceeded for ${operationType}`;

  const ctx = mergeContext({
    userId,
    metadata: {
      operationType,
      rateLimitAllowed: allowed,
      ...(remaining !== undefined ? { rateLimitRemaining: remaining } : {}),
    },
  });

  if (allowed) {
    baseLogger.info(ctx, message);
  } else {
    baseLogger.warn(ctx, message);
  }
}

/**
 * Log API request/response
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const requestInfo = {
    httpMethod: method,
    httpPath: path,
    httpStatus: statusCode,
    durationMs,
  };

  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const message = `${method} ${path} ${statusCode}`;

  const ctx = mergeContext({ ...context, metadata: requestInfo });

  if (level === 'error') {
    baseLogger.error(ctx, message);
  } else if (level === 'warn') {
    baseLogger.warn(ctx, message);
  } else {
    baseLogger.info(ctx, message);
  }
}

/**
 * Log conversation event
 */
export function logConversationEvent(
  conversationId: string,
  event: 'started' | 'message_received' | 'response_sent' | 'ended',
  userId?: string,
  metadata?: Record<string, unknown>
): void {
  logInfo(`Conversation ${event}`, {
    conversationId,
    userId,
    metadata: {
      event,
      ...metadata,
    },
  });
}

// ==================== LogEntry Conversion ====================

/**
 * Convert a LogEntry type to a log call
 * Useful for processing existing LogEntry objects
 */
export function logEntry(entry: LogEntry): void {
  const context: LogContext = {
    userId: entry.userId,
    conversationId: entry.conversationId,
    workflowId: entry.workflowId,
    traceId: entry.traceId,
    metadata: entry.metadata,
  };

  switch (entry.level) {
    case 'debug':
      logDebug(entry.message, context);
      break;
    case 'info':
      logInfo(entry.message, context);
      break;
    case 'warn':
      logWarn(entry.message, context);
      break;
    case 'error':
      logError(entry.message, undefined, context);
      break;
  }
}

// ==================== Performance Timing ====================

/**
 * Create a timer for measuring operation duration
 */
export function createTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

/**
 * Log operation with automatic timing
 */
export async function logTimed<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const getElapsed = createTimer();

  logDebug(`${operationName} started`, context);

  try {
    const result = await operation();
    const durationMs = getElapsed();

    logInfo(`${operationName} completed`, {
      ...context,
      metadata: { ...context?.metadata, durationMs },
    });

    return result;
  } catch (error) {
    const durationMs = getElapsed();

    logError(`${operationName} failed`, error, {
      ...context,
      metadata: { ...context?.metadata, durationMs },
    });

    throw error;
  }
}

// ==================== Export Logger Instance ====================

/**
 * Export the base Pino logger for advanced usage
 * Prefer using the helper functions for consistency
 */
export const logger = baseLogger;

/**
 * Combined logging utilities object
 * Includes all logging functions and context management
 */
const mastraLogger = {
  logger,
  logInfo,
  logDebug,
  logWarn,
  logError,
  logEntry,
  logWorkflowStep,
  logToolExecution,
  logRateLimit,
  logApiRequest,
  logConversationEvent,
  setLogContext,
  getLogContext,
  clearLogContext,
  withContext,
  createTimer,
  logTimed,
};

export default mastraLogger;
