/**
 * Mastra Logging Module Unit Tests
 *
 * Comprehensive tests for structured JSON logging including:
 * - Log context management (set, get, clear)
 * - Log level functions (info, debug, warn, error)
 * - Specialized logging (workflow, tool, rate limit, API request)
 * - PII sanitization integration
 * - Timer utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pino from 'pino';
import {
  setLogContext,
  getLogContext,
  clearLogContext,
  withContext,
  logInfo,
  logDebug,
  logWarn,
  logError,
  logWorkflowStep,
  logToolExecution,
  logRateLimit,
  logApiRequest,
  logConversationEvent,
  logEntry,
  createTimer,
  logTimed,
  logger,
} from '@/lib/mastra/logging';
import type { LogEntry } from '@/types/mastra';

// =============================================================================
// Test Setup
// =============================================================================

// Mock pino logger methods
vi.mock('pino', async () => {
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => mockLogger),
    level: 'info',
    bindings: vi.fn(() => ({})),
  };

  return {
    default: vi.fn(() => mockLogger),
    pino: vi.fn(() => mockLogger),
  };
});

// Get the mock logger for assertions
const mockLogger = vi.mocked(pino)();

beforeEach(() => {
  vi.clearAllMocks();
  clearLogContext();
});

afterEach(() => {
  clearLogContext();
});

// =============================================================================
// Context Management Tests
// =============================================================================

describe('Context Management', () => {
  describe('setLogContext', () => {
    it('should set logging context', () => {
      setLogContext({ userId: 'user-123' });
      expect(getLogContext()).toEqual({ userId: 'user-123' });
    });

    it('should set multiple context fields', () => {
      setLogContext({
        userId: 'user-123',
        conversationId: 'conv-456',
        workflowId: 'wf-789',
        traceId: 'trace-abc',
      });

      const context = getLogContext();
      expect(context.userId).toBe('user-123');
      expect(context.conversationId).toBe('conv-456');
      expect(context.workflowId).toBe('wf-789');
      expect(context.traceId).toBe('trace-abc');
    });

    it('should overwrite previous context', () => {
      setLogContext({ userId: 'user-123' });
      setLogContext({ userId: 'user-456' });
      expect(getLogContext()).toEqual({ userId: 'user-456' });
    });

    it('should set context with metadata', () => {
      setLogContext({
        userId: 'user-123',
        metadata: { browser: 'Chrome', version: '120' },
      });

      const context = getLogContext();
      expect(context.metadata).toEqual({ browser: 'Chrome', version: '120' });
    });
  });

  describe('getLogContext', () => {
    it('should return empty object when no context set', () => {
      expect(getLogContext()).toEqual({});
    });

    it('should return copy of context', () => {
      setLogContext({ userId: 'user-123' });
      const context1 = getLogContext();
      const context2 = getLogContext();

      expect(context1).toEqual(context2);
      expect(context1).not.toBe(context2);
    });
  });

  describe('clearLogContext', () => {
    it('should clear all context', () => {
      setLogContext({
        userId: 'user-123',
        conversationId: 'conv-456',
      });

      clearLogContext();
      expect(getLogContext()).toEqual({});
    });
  });

  describe('withContext', () => {
    it('should create child logger with merged context', () => {
      setLogContext({ userId: 'user-123' });
      withContext({ workflowId: 'wf-789' });

      expect(mockLogger.child).toHaveBeenCalledWith({
        userId: 'user-123',
        workflowId: 'wf-789',
      });
    });

    it('should override parent context with child context', () => {
      setLogContext({ userId: 'user-123' });
      withContext({ userId: 'user-456' });

      expect(mockLogger.child).toHaveBeenCalledWith({
        userId: 'user-456',
      });
    });
  });
});

// =============================================================================
// Basic Logging Function Tests
// =============================================================================

describe('Basic Logging Functions', () => {
  describe('logInfo', () => {
    it('should log info message', () => {
      logInfo('Gear item created');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should include context in log', () => {
      setLogContext({ userId: 'user-123' });
      logInfo('Loadout saved');

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('userId', 'user-123');
    });

    it('should merge additional context', () => {
      setLogContext({ userId: 'user-123' });
      logInfo('Item updated', { workflowId: 'wf-456' });

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('userId', 'user-123');
      expect(lastCall[0]).toHaveProperty('workflowId', 'wf-456');
    });

    it('should sanitize message for PII', () => {
      logInfo('User contact: user@test.com logged in');

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[1]).toContain('[REDACTED]');
      expect(lastCall[1]).not.toContain('user@test.com');
    });

    it('should sanitize context metadata for PII', () => {
      logInfo('Action logged', {
        metadata: { email: 'user@test.com', phone: '123-456-7890' },
      });

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toEqual({
        email: '[REDACTED]',
        phone: '[REDACTED]',
      });
    });
  });

  describe('logDebug', () => {
    it('should log debug message', () => {
      logDebug('Debug information');
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should include context', () => {
      setLogContext({ traceId: 'trace-123' });
      logDebug('Trace step');

      const lastCall = mockLogger.debug.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('traceId', 'trace-123');
    });
  });

  describe('logWarn', () => {
    it('should log warning message', () => {
      logWarn('Low stock on gear item');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should sanitize warning message', () => {
      logWarn('Warning: Invalid email format for user@test.com');

      const lastCall = mockLogger.warn.mock.calls[0];
      expect(lastCall[1]).toContain('[REDACTED]');
    });
  });

  describe('logError', () => {
    it('should log error message', () => {
      logError('Failed to save gear item');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include error details', () => {
      const error = new Error('Database connection failed');
      logError('Save failed', error);

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('errorName', 'Error');
      expect(lastCall[0]).toHaveProperty(
        'errorMessage',
        'Database connection failed'
      );
    });

    it('should include error stack', () => {
      const error = new Error('Test error');
      logError('Operation failed', error);

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('errorStack');
    });

    it('should handle error with cause', () => {
      const cause = new Error('Root cause');
      const error = new Error('Wrapper error', { cause });
      logError('Nested error', error);

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('errorCause');
      expect(lastCall[0].errorCause).toHaveProperty(
        'errorMessage',
        'Root cause'
      );
    });

    it('should handle non-Error thrown values', () => {
      logError('String error', 'Something went wrong');

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty(
        'errorMessage',
        'Something went wrong'
      );
    });

    it('should sanitize PII in error messages', () => {
      const error = new Error('Auth failed for user@test.com');
      logError('Authentication error', error);

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0].errorMessage).toContain('[REDACTED]');
    });

    it('should include context with error', () => {
      setLogContext({ userId: 'user-123' });
      const error = new Error('Failed');
      logError('Error occurred', error, { workflowId: 'wf-456' });

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('userId', 'user-123');
      expect(lastCall[0]).toHaveProperty('workflowId', 'wf-456');
    });
  });
});

// =============================================================================
// Specialized Logging Function Tests
// =============================================================================

describe('Specialized Logging Functions', () => {
  describe('logWorkflowStep', () => {
    it('should log workflow step started', () => {
      logWorkflowStep('wf-123', 'fetch-weather', 'started');

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('workflowId', 'wf-123');
      expect(lastCall[0].metadata).toHaveProperty('stepId', 'fetch-weather');
      expect(lastCall[0].metadata).toHaveProperty('stepStatus', 'started');
    });

    it('should log workflow step completed with duration', () => {
      logWorkflowStep('wf-123', 'catalog-search', 'completed', 1500);

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('durationMs', 1500);
      expect(lastCall[0].metadata).toHaveProperty('stepStatus', 'completed');
    });

    it('should log workflow step failed with error', () => {
      const error = new Error('MCP timeout');
      logWorkflowStep('wf-123', 'mcp-call', 'failed', 5000, error);

      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('workflowId', 'wf-123');
      expect(lastCall[0]).toHaveProperty('errorName', 'Error');
      expect(lastCall[0]).toHaveProperty('errorMessage', 'MCP timeout');
    });
  });

  describe('logToolExecution', () => {
    it('should log tool started', () => {
      logToolExecution('gear-search', 'started');

      expect(mockLogger.info).toHaveBeenCalled();
      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('toolName', 'gear-search');
      expect(lastCall[0].metadata).toHaveProperty('toolStatus', 'started');
    });

    it('should log tool completed with latency', () => {
      logToolExecution('catalog-lookup', 'completed', 250);

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('latencyMs', 250);
    });

    it('should log tool failed with error and context', () => {
      const error = new Error('Tool unavailable');
      logToolExecution('mcp-gear-graph', 'failed', 5000, error, {
        userId: 'user-123',
      });

      expect(mockLogger.error).toHaveBeenCalled();
      const lastCall = mockLogger.error.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('userId', 'user-123');
      expect(lastCall[0]).toHaveProperty('errorMessage', 'Tool unavailable');
    });
  });

  describe('logRateLimit', () => {
    it('should log rate limit check passed', () => {
      logRateLimit('user-123', 'workflow', true, 5);

      expect(mockLogger.info).toHaveBeenCalled();
      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('userId', 'user-123');
      expect(lastCall[0].metadata).toHaveProperty('rateLimitAllowed', true);
      expect(lastCall[0].metadata).toHaveProperty('rateLimitRemaining', 5);
    });

    it('should log rate limit exceeded as warning', () => {
      logRateLimit('user-456', 'voice', false);

      expect(mockLogger.warn).toHaveBeenCalled();
      const lastCall = mockLogger.warn.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('rateLimitAllowed', false);
    });
  });

  describe('logApiRequest', () => {
    it('should log successful request as info', () => {
      logApiRequest('GET', '/api/gear', 200, 150);

      expect(mockLogger.info).toHaveBeenCalled();
      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('httpMethod', 'GET');
      expect(lastCall[0].metadata).toHaveProperty('httpPath', '/api/gear');
      expect(lastCall[0].metadata).toHaveProperty('httpStatus', 200);
      expect(lastCall[0].metadata).toHaveProperty('durationMs', 150);
    });

    it('should log 4xx request as warning', () => {
      logApiRequest('POST', '/api/loadouts', 400, 50);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log 404 as warning', () => {
      logApiRequest('GET', '/api/gear/unknown', 404, 25);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log 5xx request as error', () => {
      logApiRequest('PUT', '/api/profile', 500, 2000);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include optional context', () => {
      logApiRequest('DELETE', '/api/gear/123', 204, 100, {
        userId: 'user-123',
      });

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('userId', 'user-123');
    });
  });

  describe('logConversationEvent', () => {
    it('should log conversation started', () => {
      logConversationEvent('conv-123', 'started', 'user-456');

      expect(mockLogger.info).toHaveBeenCalled();
      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0]).toHaveProperty('conversationId', 'conv-123');
      expect(lastCall[0]).toHaveProperty('userId', 'user-456');
      expect(lastCall[0].metadata).toHaveProperty('event', 'started');
    });

    it('should log message received with metadata', () => {
      logConversationEvent('conv-123', 'message_received', 'user-456', {
        messageLength: 150,
        hasAttachment: false,
      });

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('messageLength', 150);
      expect(lastCall[0].metadata).toHaveProperty('hasAttachment', false);
    });

    it('should log response sent', () => {
      logConversationEvent('conv-123', 'response_sent', 'user-456');

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('event', 'response_sent');
    });

    it('should log conversation ended', () => {
      logConversationEvent('conv-123', 'ended', 'user-456', {
        totalMessages: 10,
        durationMinutes: 5,
      });

      const lastCall = mockLogger.info.mock.calls[0];
      expect(lastCall[0].metadata).toHaveProperty('event', 'ended');
      expect(lastCall[0].metadata).toHaveProperty('totalMessages', 10);
    });
  });
});

// =============================================================================
// logEntry Tests
// =============================================================================

describe('logEntry', () => {
  it('should log debug entry', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      message: 'Debug message',
      userId: 'user-123',
    };

    logEntry(entry);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should log info entry', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'Info message',
      conversationId: 'conv-456',
    };

    logEntry(entry);
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should log warn entry', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      message: 'Warning message',
    };

    logEntry(entry);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should log error entry', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      message: 'Error message',
      workflowId: 'wf-789',
    };

    logEntry(entry);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should pass all context fields', () => {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'Full entry',
      userId: 'user-123',
      conversationId: 'conv-456',
      workflowId: 'wf-789',
      traceId: 'trace-abc',
      metadata: { key: 'value' },
    };

    logEntry(entry);

    const lastCall = mockLogger.info.mock.calls[0];
    expect(lastCall[0]).toHaveProperty('userId', 'user-123');
    expect(lastCall[0]).toHaveProperty('conversationId', 'conv-456');
    expect(lastCall[0]).toHaveProperty('workflowId', 'wf-789');
    expect(lastCall[0]).toHaveProperty('traceId', 'trace-abc');
  });
});

// =============================================================================
// Timer Utilities Tests
// =============================================================================

describe('Timer Utilities', () => {
  describe('createTimer', () => {
    it('should return elapsed time function', () => {
      const getElapsed = createTimer();
      expect(typeof getElapsed).toBe('function');
    });

    it('should return non-negative elapsed time', async () => {
      const getElapsed = createTimer();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const elapsed = getElapsed();
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should return integer milliseconds', () => {
      const getElapsed = createTimer();
      const elapsed = getElapsed();
      expect(Number.isInteger(elapsed)).toBe(true);
    });
  });

  describe('logTimed', () => {
    it('should log start and completion messages', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      await logTimed('test-operation', operation);

      expect(mockLogger.debug).toHaveBeenCalled(); // Started
      expect(mockLogger.info).toHaveBeenCalled(); // Completed
    });

    it('should return operation result', async () => {
      const operation = vi.fn().mockResolvedValue({ success: true });

      const result = await logTimed('my-operation', operation);

      expect(result).toEqual({ success: true });
    });

    it('should include duration in completion log', async () => {
      const operation = vi.fn().mockResolvedValue('done');

      await logTimed('timed-op', operation);

      const infoCall = mockLogger.info.mock.calls[0];
      expect(infoCall[0].metadata).toHaveProperty('durationMs');
      expect(typeof infoCall[0].metadata.durationMs).toBe('number');
    });

    it('should log error and rethrow on failure', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(logTimed('failing-op', operation)).rejects.toThrow(
        'Operation failed'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include duration even on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      try {
        await logTimed('failing-op', operation);
      } catch {
        // Expected
      }

      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[0].metadata).toHaveProperty('durationMs');
    });

    it('should pass context to logs', async () => {
      const operation = vi.fn().mockResolvedValue('done');

      await logTimed('contexted-op', operation, { userId: 'user-123' });

      const infoCall = mockLogger.info.mock.calls[0];
      expect(infoCall[0]).toHaveProperty('userId', 'user-123');
    });

    it('should preserve existing metadata context', async () => {
      const operation = vi.fn().mockResolvedValue('done');

      await logTimed('metadata-op', operation, {
        metadata: { existingKey: 'existingValue' },
      });

      const infoCall = mockLogger.info.mock.calls[0];
      expect(infoCall[0].metadata).toHaveProperty('existingKey', 'existingValue');
      expect(infoCall[0].metadata).toHaveProperty('durationMs');
    });
  });
});

// =============================================================================
// Logger Instance Tests
// =============================================================================

describe('Logger Instance', () => {
  it('should export logger instance', () => {
    expect(logger).toBeDefined();
  });

  it('should have expected log methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration Tests', () => {
  it('should handle complete workflow logging scenario', () => {
    // Simulate a workflow execution
    setLogContext({
      userId: 'user-123',
      workflowId: 'trip-planner-456',
      traceId: 'trace-abc',
    });

    // Log workflow start
    logInfo('Trip planner workflow started');

    // Log tool execution
    logToolExecution('weather-lookup', 'started');
    logToolExecution('weather-lookup', 'completed', 250);

    // Log another step
    logWorkflowStep('trip-planner-456', 'gear-recommendation', 'started');
    logWorkflowStep('trip-planner-456', 'gear-recommendation', 'completed', 500);

    // Verify all logs were made
    expect(mockLogger.info.mock.calls.length).toBeGreaterThanOrEqual(4);

    // Clear context at end
    clearLogContext();
    expect(getLogContext()).toEqual({});
  });

  it('should sanitize PII throughout workflow', () => {
    setLogContext({ userId: 'user-123' });

    // Log with PII in various places
    logInfo('Processing request from hiker@mountain.com');

    logError(
      'Failed for user',
      new Error('Auth failed for 192.168.1.100'),
      { metadata: { contact: '555-123-4567' } }
    );

    // Check sanitization
    const infoCall = mockLogger.info.mock.calls[0];
    expect(infoCall[1]).toContain('[REDACTED]');

    const errorCall = mockLogger.error.mock.calls[0];
    expect(errorCall[0].errorMessage).toContain('[REDACTED]');
  });

  it('should handle API request logging for gear endpoints', () => {
    setLogContext({ userId: 'user-123' });

    // Simulate various API calls
    logApiRequest('GET', '/api/gear', 200, 50);
    logApiRequest('POST', '/api/gear', 201, 150);
    logApiRequest('PUT', '/api/gear/item-123', 200, 100);
    logApiRequest('DELETE', '/api/gear/item-456', 204, 75);
    logApiRequest('GET', '/api/gear/missing', 404, 25);

    expect(mockLogger.info.mock.calls.length).toBe(4);
    expect(mockLogger.warn.mock.calls.length).toBe(1);
  });
});
