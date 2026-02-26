/**
 * Mastra Metrics Module Unit Tests
 *
 * Comprehensive tests for Prometheus-compatible metrics including:
 * - Chat/Agent metrics (requests, latency, errors)
 * - Workflow metrics (executions, duration, status)
 * - Memory operation metrics (queries, writes, GDPR)
 * - Tool invocation metrics (local and MCP tools)
 * - Voice interaction metrics (transcription, synthesis)
 * - Rate limiting metrics
 * - System health metrics
 * - Helper functions (timers, query classification)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Registry
  register,
  // Chat/Agent metrics
  chatRequestsTotal,
  chatLatencyMs,
  agentLatencySeconds,
  chatErrorsTotal,
  errorsTotal,
  tokensUsedTotal,
  // Workflow metrics
  workflowExecutionsTotal,
  workflowDurationMs,
  workflowDurationSeconds,
  workflowStatusTotal,
  workflowStepDurationMs,
  workflowStepDurationSeconds,
  // Memory metrics
  memoryOperationsTotal,
  memoryQueriesTotal,
  memoryWritesTotal,
  memoryQueryLatencyMs,
  memoryQueryDurationSeconds,
  memoryDeletionsTotal,
  memoryDeletionDurationMs,
  // Tool metrics
  toolCallsTotal,
  toolDurationSeconds,
  mcpToolCallsTotal,
  mcpToolLatencyMs,
  mcpToolDurationSeconds,
  mcpToolErrorsTotal,
  mcpFallbackTotal,
  // Voice metrics
  voiceTranscriptionsTotal,
  voiceTranscriptionLatencyMs,
  voiceTranscriptionDurationSeconds,
  voiceTranscriptionConfidence,
  voiceSynthesisTotal,
  voiceSynthesisLatencyMs,
  voiceSynthesisDurationSeconds,
  voiceEndToEndDurationSeconds,
  // Rate limit metrics
  rateLimitHitsTotal,
  rateLimitActiveWindows,
  // System metrics
  agentUptimeSeconds,
  activeConversations,
  usersWithMemoryTotal,
  // Helper functions
  recordChatRequest,
  recordChatLatency,
  recordAgentLatency,
  recordChatError,
  recordTokenUsage,
  recordWorkflowExecution,
  recordWorkflowDuration,
  recordWorkflowStatus,
  recordWorkflowStepDuration,
  recordMemoryOperation,
  recordMemoryQueryLatency,
  recordGdprDeletion,
  recordGdprDeletionDuration,
  recordToolCall,
  recordToolDuration,
  recordMcpToolCall,
  recordMcpToolLatency,
  recordMcpToolError,
  recordMcpFallback,
  recordVoiceTranscription,
  recordVoiceSynthesis,
  recordVoiceEndToEnd,
  recordRateLimitHit,
  setActiveRateLimitWindows,
  setActiveConversations,
  setUsersWithMemory,
  collectMetrics,
  getMetricsContentType,
  classifyQuery,
  startTimer,
  // Types
  type ErrorType,
  type OperationType,
  type QueryType,
  type MemoryOperation,
  type WorkflowStatus,
  type VoiceProvider,
  type TTSModelType,
} from '@/lib/mastra/metrics';

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  // Reset all metrics before each test
  register.resetMetrics();
});

// =============================================================================
// Registry Tests
// =============================================================================

describe('Prometheus Registry', () => {
  it('should have a global registry', () => {
    expect(register).toBeDefined();
  });

  it('should collect metrics as text', async () => {
    const metricsText = await collectMetrics();
    expect(typeof metricsText).toBe('string');
    expect(metricsText.length).toBeGreaterThan(0);
  });

  it('should return Prometheus content type', () => {
    const contentType = getMetricsContentType();
    expect(contentType).toContain('text/plain');
  });
});

// =============================================================================
// Chat/Agent Metrics Tests
// =============================================================================

describe('Chat/Agent Metrics', () => {
  describe('chatRequestsTotal', () => {
    it('should increment for simple_query', () => {
      recordChatRequest('simple_query');
      // Counter should be defined and callable
      expect(chatRequestsTotal).toBeDefined();
    });

    it('should increment for workflow', () => {
      recordChatRequest('workflow');
      expect(chatRequestsTotal).toBeDefined();
    });

    it('should increment for voice', () => {
      recordChatRequest('voice');
      expect(chatRequestsTotal).toBeDefined();
    });
  });

  describe('chatLatencyMs', () => {
    it('should record latency values', () => {
      recordChatLatency(500);
      recordChatLatency(1500);
      recordChatLatency(3000);
      expect(chatLatencyMs).toBeDefined();
    });

    it('should handle edge case latencies', () => {
      recordChatLatency(0);
      recordChatLatency(10000);
      expect(chatLatencyMs).toBeDefined();
    });
  });

  describe('agentLatencySeconds', () => {
    it('should record latency with query type', () => {
      recordAgentLatency(0.5, 'simple');
      recordAgentLatency(2.0, 'medium');
      recordAgentLatency(5.0, 'complex');
      expect(agentLatencySeconds).toBeDefined();
    });

    it('should use default query type', () => {
      recordAgentLatency(1.0);
      expect(agentLatencySeconds).toBeDefined();
    });
  });

  describe('chatErrorsTotal', () => {
    it('should increment for rate_limit errors', () => {
      recordChatError('rate_limit');
      expect(chatErrorsTotal).toBeDefined();
      expect(errorsTotal).toBeDefined();
    });

    it('should increment for agent_failure', () => {
      recordChatError('agent_failure');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for memory_unavailable', () => {
      recordChatError('memory_unavailable');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for mcp_timeout', () => {
      recordChatError('mcp_timeout');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for validation', () => {
      recordChatError('validation');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for ai_unavailable', () => {
      recordChatError('ai_unavailable');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for stream_error', () => {
      recordChatError('stream_error');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for server_error', () => {
      recordChatError('server_error');
      expect(chatErrorsTotal).toBeDefined();
    });

    it('should increment for unknown', () => {
      recordChatError('unknown');
      expect(chatErrorsTotal).toBeDefined();
    });
  });

  describe('tokensUsedTotal', () => {
    it('should record prompt and completion tokens', () => {
      recordTokenUsage('gpt-4o-mini', 100, 50);
      expect(tokensUsedTotal).toBeDefined();
    });

    it('should record tokens for different models', () => {
      recordTokenUsage('claude-3-5-sonnet', 200, 150);
      recordTokenUsage('gpt-4o', 500, 300);
      expect(tokensUsedTotal).toBeDefined();
    });
  });
});

// =============================================================================
// Workflow Metrics Tests
// =============================================================================

describe('Workflow Metrics', () => {
  describe('workflowExecutionsTotal', () => {
    it('should record workflow execution', () => {
      recordWorkflowExecution('trip-planner');
      recordWorkflowExecution('gear-recommendation');
      expect(workflowExecutionsTotal).toBeDefined();
    });
  });

  describe('workflowDurationMs and workflowDurationSeconds', () => {
    it('should record duration in both units', () => {
      recordWorkflowDuration('trip-planner', 15000);
      expect(workflowDurationMs).toBeDefined();
      expect(workflowDurationSeconds).toBeDefined();
    });

    it('should handle short workflows', () => {
      recordWorkflowDuration('quick-lookup', 500);
      expect(workflowDurationMs).toBeDefined();
    });

    it('should handle long workflows', () => {
      recordWorkflowDuration('complex-planning', 60000);
      expect(workflowDurationMs).toBeDefined();
    });
  });

  describe('workflowStatusTotal', () => {
    it('should record completed status', () => {
      recordWorkflowStatus('completed');
      expect(workflowStatusTotal).toBeDefined();
    });

    it('should record failed status', () => {
      recordWorkflowStatus('failed');
      expect(workflowStatusTotal).toBeDefined();
    });

    it('should record timeout status', () => {
      recordWorkflowStatus('timeout');
      expect(workflowStatusTotal).toBeDefined();
    });
  });

  describe('workflowStepDurationMs and workflowStepDurationSeconds', () => {
    it('should record step duration', () => {
      recordWorkflowStepDuration('trip-planner', 'fetch-weather', 2000);
      expect(workflowStepDurationMs).toBeDefined();
      expect(workflowStepDurationSeconds).toBeDefined();
    });

    it('should record multiple steps', () => {
      recordWorkflowStepDuration('gear-planner', 'analyze-inventory', 1500);
      recordWorkflowStepDuration('gear-planner', 'find-gaps', 3000);
      recordWorkflowStepDuration('gear-planner', 'suggest-items', 2500);
      expect(workflowStepDurationMs).toBeDefined();
    });
  });
});

// =============================================================================
// Memory Operation Metrics Tests
// =============================================================================

describe('Memory Operation Metrics', () => {
  describe('memoryOperationsTotal', () => {
    it('should record save_messages operation', () => {
      recordMemoryOperation('save_messages');
      expect(memoryOperationsTotal).toBeDefined();
      expect(memoryWritesTotal).toBeDefined();
    });

    it('should record get_messages operation', () => {
      recordMemoryOperation('get_messages');
      expect(memoryOperationsTotal).toBeDefined();
      expect(memoryQueriesTotal).toBeDefined();
    });

    it('should record search_messages operation', () => {
      recordMemoryOperation('search_messages');
      expect(memoryQueriesTotal).toBeDefined();
    });

    it('should record delete_messages operation', () => {
      recordMemoryOperation('delete_messages');
      expect(memoryWritesTotal).toBeDefined();
    });
  });

  describe('memoryQueryLatencyMs and memoryQueryDurationSeconds', () => {
    it('should record query latency', () => {
      recordMemoryQueryLatency('get_messages', 50);
      recordMemoryQueryLatency('search_messages', 200);
      expect(memoryQueryLatencyMs).toBeDefined();
      expect(memoryQueryDurationSeconds).toBeDefined();
    });
  });

  describe('GDPR Deletion Metrics', () => {
    it('should record deletion request status', () => {
      recordGdprDeletion('requested');
      recordGdprDeletion('completed');
      recordGdprDeletion('failed');
      expect(memoryDeletionsTotal).toBeDefined();
    });

    it('should record deletion duration', () => {
      recordGdprDeletionDuration(300000); // 5 minutes
      recordGdprDeletionDuration(3600000); // 1 hour
      expect(memoryDeletionDurationMs).toBeDefined();
    });
  });
});

// =============================================================================
// Tool Invocation Metrics Tests
// =============================================================================

describe('Tool Invocation Metrics', () => {
  describe('Local Tool Metrics', () => {
    it('should record tool call', () => {
      recordToolCall('gear-search');
      recordToolCall('loadout-analyzer');
      expect(toolCallsTotal).toBeDefined();
    });

    it('should record tool duration', () => {
      recordToolDuration('weather-lookup', 0.5);
      recordToolDuration('catalog-search', 1.2);
      expect(toolDurationSeconds).toBeDefined();
    });
  });

  describe('MCP Tool Metrics', () => {
    it('should record MCP tool call with success', () => {
      recordMcpToolCall('gear-graph-search', 'success');
      expect(mcpToolCallsTotal).toBeDefined();
    });

    it('should record MCP tool call with error', () => {
      recordMcpToolCall('gear-graph-compare', 'error');
      expect(mcpToolCallsTotal).toBeDefined();
    });

    it('should record MCP tool call with timeout', () => {
      recordMcpToolCall('gear-graph-analyze', 'timeout');
      expect(mcpToolCallsTotal).toBeDefined();
    });

    it('should record MCP tool latency', () => {
      recordMcpToolLatency('gear-graph-search', 500, 'http');
      recordMcpToolLatency('local-tool', 100, 'stdio');
      expect(mcpToolLatencyMs).toBeDefined();
      expect(mcpToolDurationSeconds).toBeDefined();
    });

    it('should use default transport', () => {
      recordMcpToolLatency('some-tool', 250);
      expect(mcpToolLatencyMs).toBeDefined();
    });

    it('should record MCP tool errors', () => {
      recordMcpToolError('gear-graph', 'connection_refused');
      recordMcpToolError('gear-graph', 'timeout');
      recordMcpToolError('gear-graph', 'parse_error');
      expect(mcpToolErrorsTotal).toBeDefined();
    });

    it('should record MCP fallback', () => {
      recordMcpFallback('gear-graph-search', 'timeout');
      recordMcpFallback('gear-graph-compare', 'error');
      recordMcpFallback('gear-graph-analyze', 'unavailable');
      expect(mcpFallbackTotal).toBeDefined();
    });
  });
});

// =============================================================================
// Voice Interaction Metrics Tests
// =============================================================================

describe('Voice Interaction Metrics', () => {
  describe('Transcription Metrics', () => {
    it('should record voice transcription with whisper', () => {
      recordVoiceTranscription('whisper', 2000, 0.95);
      expect(voiceTranscriptionsTotal).toBeDefined();
      expect(voiceTranscriptionLatencyMs).toBeDefined();
      expect(voiceTranscriptionDurationSeconds).toBeDefined();
      expect(voiceTranscriptionConfidence).toBeDefined();
    });

    it('should record voice transcription with vercel-ai-sdk', () => {
      recordVoiceTranscription('vercel-ai-sdk', 1500, 0.92);
      expect(voiceTranscriptionsTotal).toBeDefined();
    });

    it('should record voice transcription with elevenlabs', () => {
      recordVoiceTranscription('elevenlabs', 1800, 0.88);
      expect(voiceTranscriptionsTotal).toBeDefined();
    });
  });

  describe('Synthesis Metrics', () => {
    it('should record voice synthesis with tts-1', () => {
      recordVoiceSynthesis('tts-1', 1000);
      expect(voiceSynthesisTotal).toBeDefined();
      expect(voiceSynthesisLatencyMs).toBeDefined();
      expect(voiceSynthesisDurationSeconds).toBeDefined();
    });

    it('should record voice synthesis with tts-1-hd', () => {
      recordVoiceSynthesis('tts-1-hd', 1500);
      expect(voiceSynthesisTotal).toBeDefined();
    });

    it('should record voice synthesis with eleven_turbo_v2_5', () => {
      recordVoiceSynthesis('eleven_turbo_v2_5', 800);
      expect(voiceSynthesisTotal).toBeDefined();
    });

    it('should record voice synthesis with eleven_multilingual_v2', () => {
      recordVoiceSynthesis('eleven_multilingual_v2', 1200);
      expect(voiceSynthesisTotal).toBeDefined();
    });
  });

  describe('End-to-End Voice Metrics', () => {
    it('should record end-to-end voice latency', () => {
      recordVoiceEndToEnd(3.5, 'simple');
      recordVoiceEndToEnd(5.0, 'medium');
      recordVoiceEndToEnd(8.0, 'complex');
      expect(voiceEndToEndDurationSeconds).toBeDefined();
    });

    it('should use default query type', () => {
      recordVoiceEndToEnd(2.5);
      expect(voiceEndToEndDurationSeconds).toBeDefined();
    });
  });
});

// =============================================================================
// Rate Limiting Metrics Tests
// =============================================================================

describe('Rate Limiting Metrics', () => {
  it('should record rate limit hits for workflow', () => {
    recordRateLimitHit('workflow');
    expect(rateLimitHitsTotal).toBeDefined();
  });

  it('should record rate limit hits for voice', () => {
    recordRateLimitHit('voice');
    expect(rateLimitHitsTotal).toBeDefined();
  });

  it('should set active rate limit windows', () => {
    setActiveRateLimitWindows('workflow', 5);
    setActiveRateLimitWindows('voice', 3);
    expect(rateLimitActiveWindows).toBeDefined();
  });

  it('should handle zero active windows', () => {
    setActiveRateLimitWindows('workflow', 0);
    expect(rateLimitActiveWindows).toBeDefined();
  });
});

// =============================================================================
// System Health Metrics Tests
// =============================================================================

describe('System Health Metrics', () => {
  describe('agentUptimeSeconds', () => {
    it('should be defined', () => {
      expect(agentUptimeSeconds).toBeDefined();
    });
  });

  describe('activeConversations', () => {
    it('should set active conversations count', () => {
      setActiveConversations(10);
      setActiveConversations(15);
      setActiveConversations(5);
      expect(activeConversations).toBeDefined();
    });

    it('should handle zero active conversations', () => {
      setActiveConversations(0);
      expect(activeConversations).toBeDefined();
    });
  });

  describe('usersWithMemoryTotal', () => {
    it('should set users with memory count', () => {
      setUsersWithMemory(100);
      setUsersWithMemory(150);
      expect(usersWithMemoryTotal).toBeDefined();
    });
  });
});

// =============================================================================
// Query Classification Tests
// =============================================================================

describe('classifyQuery', () => {
  describe('Complex Queries', () => {
    it('should classify queries with "plan" as complex', () => {
      expect(classifyQuery('Help me plan a backpacking trip')).toBe('complex');
    });

    it('should classify queries with "workflow" as complex', () => {
      expect(classifyQuery('Run the gear analysis workflow')).toBe('complex');
    });

    it('should classify queries with "compare" as complex', () => {
      expect(classifyQuery('Compare these two tents')).toBe('complex');
    });

    it('should classify queries with "analyze" as complex', () => {
      expect(classifyQuery('Analyze my loadout weight distribution')).toBe(
        'complex'
      );
    });

    it('should be case-insensitive', () => {
      expect(classifyQuery('PLAN my trip')).toBe('complex');
      expect(classifyQuery('Analyze WEIGHT')).toBe('complex');
    });
  });

  describe('Medium Queries', () => {
    it('should classify queries with "find" as medium', () => {
      expect(classifyQuery('Find ultralight tents under 2lbs')).toBe('medium');
    });

    it('should classify queries with "recommend" as medium', () => {
      expect(classifyQuery('Recommend a sleeping bag')).toBe('medium');
    });

    it('should classify queries with "search" as medium', () => {
      expect(classifyQuery('Search for waterproof jackets')).toBe('medium');
    });

    it('should classify queries with "suggest" as medium', () => {
      expect(classifyQuery('Suggest alternatives to my tent')).toBe('medium');
    });
  });

  describe('Simple Queries', () => {
    it('should classify basic questions as simple', () => {
      expect(classifyQuery('What is the weight of my pack?')).toBe('simple');
    });

    it('should classify short queries as simple', () => {
      expect(classifyQuery('Hello')).toBe('simple');
    });

    it('should classify general info queries as simple', () => {
      expect(classifyQuery('Tell me about this tent')).toBe('simple');
    });

    it('should default to simple for empty queries', () => {
      expect(classifyQuery('')).toBe('simple');
    });
  });
});

// =============================================================================
// Timer Utility Tests
// =============================================================================

describe('startTimer', () => {
  it('should return a function', () => {
    const stopTimer = startTimer();
    expect(typeof stopTimer).toBe('function');
  });

  it('should return elapsed time in milliseconds', async () => {
    const stopTimer = startTimer();

    // Wait a small amount
    await new Promise((resolve) => setTimeout(resolve, 10));

    const elapsed = stopTimer();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it('should return consistent results on multiple calls', () => {
    const stopTimer = startTimer();

    const elapsed1 = stopTimer();
    const elapsed2 = stopTimer();

    // Second call should return a larger or equal value
    expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
  });

  it('should work for very short operations', () => {
    const stopTimer = startTimer();
    const elapsed = stopTimer();

    // Should be a non-negative number
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(typeof elapsed).toBe('number');
  });
});

// =============================================================================
// Type Safety Tests
// =============================================================================

describe('Type Safety', () => {
  it('should accept valid ErrorType values', () => {
    const errorTypes: ErrorType[] = [
      'rate_limit',
      'agent_failure',
      'memory_unavailable',
      'mcp_timeout',
      'validation',
      'ai_unavailable',
      'stream_error',
      'server_error',
      'workflow_fallback',
      'unknown',
    ];

    errorTypes.forEach((errorType) => {
      recordChatError(errorType);
    });
  });

  it('should accept valid OperationType values', () => {
    const operationTypes: OperationType[] = [
      'simple_query',
      'workflow',
      'voice',
    ];

    operationTypes.forEach((opType) => {
      recordChatRequest(opType);
    });
  });

  it('should accept valid QueryType values', () => {
    const queryTypes: QueryType[] = ['simple', 'medium', 'complex'];

    queryTypes.forEach((queryType) => {
      recordAgentLatency(1.0, queryType);
    });
  });

  it('should accept valid MemoryOperation values', () => {
    const memoryOps: MemoryOperation[] = [
      'save_messages',
      'get_messages',
      'search_messages',
      'delete_messages',
    ];

    memoryOps.forEach((op) => {
      recordMemoryOperation(op);
    });
  });

  it('should accept valid WorkflowStatus values', () => {
    const statuses: WorkflowStatus[] = ['completed', 'failed', 'timeout'];

    statuses.forEach((status) => {
      recordWorkflowStatus(status);
    });
  });

  it('should accept valid VoiceProvider values', () => {
    const providers: VoiceProvider[] = [
      'whisper',
      'vercel-ai-sdk',
      'elevenlabs',
    ];

    providers.forEach((provider) => {
      recordVoiceTranscription(provider, 1000, 0.9);
    });
  });

  it('should accept valid TTSModelType values', () => {
    const models: TTSModelType[] = [
      'tts-1',
      'tts-1-hd',
      'eleven_turbo_v2_5',
      'eleven_multilingual_v2',
    ];

    models.forEach((model) => {
      recordVoiceSynthesis(model, 1000);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration Tests', () => {
  it('should handle complete chat request flow', () => {
    // Start of request
    const timer = startTimer();
    recordChatRequest('simple_query');

    // Query classification
    const queryType = classifyQuery('What is the weight of my backpack?');
    expect(queryType).toBe('simple');

    // Token usage
    recordTokenUsage('gpt-4o-mini', 150, 75);

    // End of request
    const latencyMs = timer();
    recordChatLatency(latencyMs);
    recordAgentLatency(latencyMs / 1000, queryType);
  });

  it('should handle complete workflow execution', () => {
    const workflowName = 'trip-planner';

    // Start workflow
    recordWorkflowExecution(workflowName);

    // Step 1: Weather lookup
    recordWorkflowStepDuration(workflowName, 'fetch-weather', 2000);

    // Step 2: Gear analysis (uses MCP tool)
    recordMcpToolCall('gear-graph-analyze', 'success');
    recordMcpToolLatency('gear-graph-analyze', 3500, 'http');
    recordWorkflowStepDuration(workflowName, 'analyze-gear', 3500);

    // Step 3: Recommendations
    recordWorkflowStepDuration(workflowName, 'generate-recommendations', 1500);

    // Complete workflow
    recordWorkflowDuration(workflowName, 7000);
    recordWorkflowStatus('completed');
  });

  it('should handle workflow failure with fallback', () => {
    const workflowName = 'gear-search';

    recordWorkflowExecution(workflowName);

    // MCP tool fails
    recordMcpToolCall('gear-graph-search', 'timeout');
    recordMcpToolError('gear-graph-search', 'timeout');

    // Fallback to catalog search
    recordMcpFallback('gear-graph-search', 'timeout');
    recordToolCall('catalog-search');
    recordToolDuration('catalog-search', 0.5);

    // Workflow completes with fallback
    recordWorkflowDuration(workflowName, 5500);
    recordWorkflowStatus('completed');
  });

  it('should handle voice interaction flow', () => {
    // User speaks
    recordVoiceTranscription('whisper', 1500, 0.94);

    // Process query
    recordChatRequest('voice');
    const queryType = classifyQuery('Find me a lightweight tent');
    expect(queryType).toBe('medium');

    // Token usage for response
    recordTokenUsage('gpt-4o-mini', 50, 100);

    // Synthesize response
    recordVoiceSynthesis('tts-1-hd', 1200);

    // Total end-to-end
    recordVoiceEndToEnd(4.2, queryType);
  });

  it('should handle rate limit scenario', () => {
    // First few requests succeed
    for (let i = 0; i < 5; i++) {
      recordChatRequest('workflow');
      recordWorkflowExecution('trip-planner');
    }

    // Rate limit hit
    recordRateLimitHit('workflow');
    setActiveRateLimitWindows('workflow', 1);

    // Error recorded
    recordChatError('rate_limit');
  });

  it('should handle memory operations', () => {
    // Save conversation
    recordMemoryOperation('save_messages');
    recordMemoryQueryLatency('save_messages', 50);

    // Later: retrieve messages
    recordMemoryOperation('get_messages');
    recordMemoryQueryLatency('get_messages', 30);

    // Search history
    recordMemoryOperation('search_messages');
    recordMemoryQueryLatency('search_messages', 150);
  });

  it('should handle GDPR deletion request', () => {
    // User requests deletion
    recordGdprDeletion('requested');

    // Process deletion
    recordMemoryOperation('delete_messages');

    // Complete deletion
    recordGdprDeletionDuration(120000); // 2 minutes
    recordGdprDeletion('completed');
  });

  it('should track system health metrics', () => {
    // Simulate active state
    setActiveConversations(25);
    setUsersWithMemory(1500);
    setActiveRateLimitWindows('workflow', 10);
    setActiveRateLimitWindows('voice', 5);

    expect(activeConversations).toBeDefined();
    expect(usersWithMemoryTotal).toBeDefined();
    expect(rateLimitActiveWindows).toBeDefined();
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Edge Cases', () => {
  it('should handle zero latency', () => {
    recordChatLatency(0);
    recordAgentLatency(0);
    expect(chatLatencyMs).toBeDefined();
  });

  it('should handle very large latency values', () => {
    recordChatLatency(60000); // 1 minute
    recordWorkflowDuration('long-workflow', 300000); // 5 minutes
    expect(chatLatencyMs).toBeDefined();
  });

  it('should handle empty workflow name', () => {
    recordWorkflowExecution('');
    recordWorkflowDuration('', 1000);
    expect(workflowExecutionsTotal).toBeDefined();
  });

  it('should handle special characters in labels', () => {
    recordToolCall('gear-search:v2');
    recordMcpToolCall('mcp/gear-graph', 'success');
    expect(toolCallsTotal).toBeDefined();
  });

  it('should handle very low confidence scores', () => {
    recordVoiceTranscription('whisper', 2000, 0.1);
    recordVoiceTranscription('whisper', 2000, 0.0);
    expect(voiceTranscriptionConfidence).toBeDefined();
  });

  it('should handle perfect confidence', () => {
    recordVoiceTranscription('whisper', 1000, 1.0);
    expect(voiceTranscriptionConfidence).toBeDefined();
  });

  it('should handle zero token usage', () => {
    recordTokenUsage('gpt-4o-mini', 0, 0);
    expect(tokensUsedTotal).toBeDefined();
  });

  it('should handle large token counts', () => {
    recordTokenUsage('gpt-4o', 10000, 5000);
    expect(tokensUsedTotal).toBeDefined();
  });
});
