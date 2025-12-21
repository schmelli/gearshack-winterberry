/**
 * Prometheus Metrics Module for Mastra Agent
 * Feature: 001-mastra-agentic-voice (T021)
 *
 * Provides Prometheus-compatible metrics collectors for:
 * - Agent performance (latency, requests, tokens)
 * - Workflow execution (duration, status, step timing)
 * - Tool invocations (MCP and local tools)
 * - Memory operations (queries, writes, GDPR deletions)
 * - Voice interactions (transcription, synthesis)
 * - Rate limiting and system health
 *
 * @see specs/001-mastra-agentic-voice/contracts/api-mastra-metrics.md
 * @see types/mastra.ts for PrometheusMetric type definitions
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

// ==================== Registry Setup ====================

/**
 * Global Prometheus registry
 * Export for use in /api/mastra/metrics endpoint
 */
export const register = new Registry();

// Collect Node.js default metrics (memory, CPU, GC, etc.)
collectDefaultMetrics({
  register,
  prefix: 'mastra_nodejs_',
});

// ==================== Chat/Agent Metrics ====================

/**
 * Total chat requests by operation type
 * Labels: operation_type (simple_query, workflow)
 */
export const chatRequestsTotal = new Counter({
  name: 'mastra_chat_requests_total',
  help: 'Total number of chat requests',
  labelNames: ['operation_type'] as const,
  registers: [register],
});

/**
 * Chat response latency in milliseconds
 * Histogram buckets: 500ms, 1s, 2s, 5s, 10s, +Inf
 */
export const chatLatencyMs = new Histogram({
  name: 'mastra_chat_latency_ms',
  help: 'Response latency in milliseconds',
  buckets: [500, 1000, 2000, 5000, 10000],
  registers: [register],
});

/**
 * Agent response latency in seconds (P50/P95/P99 support)
 * Labels: query_type (simple, medium, complex)
 */
export const agentLatencySeconds = new Histogram({
  name: 'mastra_agent_latency_seconds',
  help: 'Agent response latency in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  labelNames: ['query_type'] as const,
  registers: [register],
});

/**
 * Chat errors by error type
 * Labels: error_type (rate_limit, agent_failure, memory_unavailable, mcp_timeout, validation)
 */
export const chatErrorsTotal = new Counter({
  name: 'mastra_chat_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type'] as const,
  registers: [register],
});

/**
 * Generic errors counter with error_type label
 * Alias for chatErrorsTotal for broader use
 */
export const errorsTotal = new Counter({
  name: 'mastra_errors_total',
  help: 'Total number of Mastra errors',
  labelNames: ['error_type'] as const,
  registers: [register],
});

/**
 * Total LLM tokens consumed
 * Labels: model, type (prompt, completion)
 */
export const tokensUsedTotal = new Counter({
  name: 'mastra_tokens_total',
  help: 'Total LLM tokens consumed',
  labelNames: ['model', 'type'] as const,
  registers: [register],
});

// ==================== Workflow Metrics ====================

/**
 * Total workflow executions by workflow name
 * Labels: workflow_name
 */
export const workflowExecutionsTotal = new Counter({
  name: 'mastra_workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_name'] as const,
  registers: [register],
});

/**
 * Workflow duration in milliseconds
 * Labels: workflow_name
 */
export const workflowDurationMs = new Histogram({
  name: 'mastra_workflow_duration_ms',
  help: 'Workflow execution duration in milliseconds',
  buckets: [5000, 10000, 20000, 30000, 60000],
  labelNames: ['workflow_name'] as const,
  registers: [register],
});

/**
 * Workflow duration in seconds (alternative metric)
 * Labels: workflow_name
 */
export const workflowDurationSeconds = new Histogram({
  name: 'mastra_workflow_duration_seconds',
  help: 'Workflow execution duration in seconds',
  buckets: [5, 10, 20, 30, 60, 120],
  labelNames: ['workflow_name'] as const,
  registers: [register],
});

/**
 * Workflow executions by final status
 * Labels: status (completed, failed, timeout)
 */
export const workflowStatusTotal = new Counter({
  name: 'mastra_workflow_status_total',
  help: 'Workflow executions by final status',
  labelNames: ['status'] as const,
  registers: [register],
});

/**
 * Individual workflow step duration in milliseconds
 * Labels: workflow_name, step
 */
export const workflowStepDurationMs = new Histogram({
  name: 'mastra_workflow_step_duration_ms',
  help: 'Duration of individual workflow steps in milliseconds',
  buckets: [1000, 2000, 5000, 10000, 20000],
  labelNames: ['workflow_name', 'step'] as const,
  registers: [register],
});

/**
 * Workflow step duration in seconds
 * Labels: workflow_name, step_name
 */
export const workflowStepDurationSeconds = new Histogram({
  name: 'mastra_workflow_step_duration_seconds',
  help: 'Workflow step latency in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  labelNames: ['workflow_name', 'step_name'] as const,
  registers: [register],
});

// ==================== Memory Operation Metrics ====================

/**
 * Total memory operations
 * Labels: operation (save_messages, get_messages, search_messages, delete_messages)
 */
export const memoryOperationsTotal = new Counter({
  name: 'mastra_memory_operations_total',
  help: 'Total memory adapter operations',
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * Memory queries total (reads)
 * Labels: operation (get_messages, search_messages)
 */
export const memoryQueriesTotal = new Counter({
  name: 'mastra_memory_queries_total',
  help: 'Total number of memory queries',
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * Memory writes total
 * Labels: operation (save_messages, delete_messages)
 */
export const memoryWritesTotal = new Counter({
  name: 'mastra_memory_writes_total',
  help: 'Total number of memory writes',
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * Memory query latency in milliseconds
 * Labels: operation
 */
export const memoryQueryLatencyMs = new Histogram({
  name: 'mastra_memory_query_latency_ms',
  help: 'Memory query latency in milliseconds',
  buckets: [100, 500, 1000, 2000, 5000],
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * Memory query duration in seconds
 * Labels: operation
 */
export const memoryQueryDurationSeconds = new Histogram({
  name: 'mastra_memory_query_duration_seconds',
  help: 'Memory query latency in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * GDPR deletion requests by status
 * Labels: status (requested, completed, failed)
 */
export const memoryDeletionsTotal = new Counter({
  name: 'mastra_memory_deletions_total',
  help: 'Total number of GDPR deletion requests',
  labelNames: ['status'] as const,
  registers: [register],
});

/**
 * GDPR deletion duration in milliseconds
 */
export const memoryDeletionDurationMs = new Histogram({
  name: 'mastra_memory_deletion_duration_ms',
  help: 'GDPR deletion duration in milliseconds',
  buckets: [60000, 300000, 3600000, 7200000],
  registers: [register],
});

// ==================== Tool Invocation Metrics ====================

/**
 * Total tool calls
 * Labels: tool_name
 */
export const toolCallsTotal = new Counter({
  name: 'mastra_tool_calls_total',
  help: 'Total tool invocations',
  labelNames: ['tool_name'] as const,
  registers: [register],
});

/**
 * Tool invocation latency in seconds
 * Labels: tool_name
 */
export const toolDurationSeconds = new Histogram({
  name: 'mastra_tool_duration_seconds',
  help: 'Tool invocation latency in seconds',
  buckets: [0.05, 0.1, 0.5, 1, 2, 5],
  labelNames: ['tool_name'] as const,
  registers: [register],
});

/**
 * MCP tool calls total
 * Labels: tool, status (success, error, timeout)
 */
export const mcpToolCallsTotal = new Counter({
  name: 'mastra_mcp_tool_calls_total',
  help: 'Total MCP tool invocations',
  labelNames: ['tool', 'status'] as const,
  registers: [register],
});

/**
 * MCP tool latency in milliseconds
 * Labels: tool
 */
export const mcpToolLatencyMs = new Histogram({
  name: 'mastra_mcp_tool_latency_ms',
  help: 'MCP tool invocation latency in milliseconds',
  buckets: [500, 1000, 2000, 5000, 10000],
  labelNames: ['tool'] as const,
  registers: [register],
});

/**
 * MCP tool duration in seconds
 * Labels: tool_name, transport (stdio, http)
 */
export const mcpToolDurationSeconds = new Histogram({
  name: 'mastra_mcp_tool_duration_seconds',
  help: 'MCP tool invocation latency in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  labelNames: ['tool_name', 'transport'] as const,
  registers: [register],
});

/**
 * MCP tool errors
 * Labels: tool, error_type (timeout, connection_refused, etc.)
 */
export const mcpToolErrorsTotal = new Counter({
  name: 'mastra_mcp_tool_errors_total',
  help: 'Total number of MCP tool errors',
  labelNames: ['tool', 'error_type'] as const,
  registers: [register],
});

/**
 * MCP fallback counter (when tools fall back to catalog search)
 * Labels: tool_name, reason (timeout, error, unavailable)
 */
export const mcpFallbackTotal = new Counter({
  name: 'mastra_mcp_fallback_total',
  help: 'MCP tool fallbacks to catalog search',
  labelNames: ['tool_name', 'reason'] as const,
  registers: [register],
});

// ==================== Voice Interaction Metrics ====================

/**
 * Voice transcriptions total
 * Labels: provider (whisper, vercel-ai-sdk, elevenlabs)
 */
export const voiceTranscriptionsTotal = new Counter({
  name: 'mastra_voice_transcriptions_total',
  help: 'Total number of voice transcriptions',
  labelNames: ['provider'] as const,
  registers: [register],
});

/**
 * Transcription latency in milliseconds
 */
export const voiceTranscriptionLatencyMs = new Histogram({
  name: 'mastra_voice_transcription_latency_ms',
  help: 'Transcription latency in milliseconds',
  buckets: [1000, 2000, 5000, 10000, 20000],
  registers: [register],
});

/**
 * Transcription duration in seconds
 */
export const voiceTranscriptionDurationSeconds = new Histogram({
  name: 'mastra_voice_transcription_duration_seconds',
  help: 'Whisper transcription latency in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Transcription confidence scores (0.0-1.0)
 */
export const voiceTranscriptionConfidence = new Histogram({
  name: 'mastra_voice_transcription_confidence',
  help: 'Transcription confidence scores (0.0-1.0)',
  buckets: [0.5, 0.7, 0.9, 1.0],
  registers: [register],
});

/**
 * Voice synthesis total
 * Labels: model (tts-1, tts-1-hd, eleven_turbo_v2_5, eleven_multilingual_v2)
 */
export const voiceSynthesisTotal = new Counter({
  name: 'mastra_voice_synthesis_total',
  help: 'Total number of voice synthesis requests',
  labelNames: ['model'] as const,
  registers: [register],
});

/**
 * Synthesis latency in milliseconds
 * Labels: model
 */
export const voiceSynthesisLatencyMs = new Histogram({
  name: 'mastra_voice_synthesis_latency_ms',
  help: 'Synthesis latency in milliseconds',
  buckets: [1000, 2000, 5000, 10000, 20000],
  labelNames: ['model'] as const,
  registers: [register],
});

/**
 * Voice synthesis duration (first chunk) in seconds
 */
export const voiceSynthesisDurationSeconds = new Histogram({
  name: 'mastra_voice_synthesis_duration_seconds',
  help: 'TTS synthesis latency (first chunk) in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * End-to-end voice interaction latency in seconds
 * Labels: query_type
 */
export const voiceEndToEndDurationSeconds = new Histogram({
  name: 'mastra_voice_end_to_end_duration_seconds',
  help: 'Total voice interaction latency in seconds',
  buckets: [1, 2, 3, 5, 10],
  labelNames: ['query_type'] as const,
  registers: [register],
});

// ==================== Rate Limiting Metrics ====================

/**
 * Rate limit hits by operation type
 * Labels: operation_type (workflow, voice)
 */
export const rateLimitHitsTotal = new Counter({
  name: 'mastra_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['operation_type'] as const,
  registers: [register],
});

/**
 * Active rate limit windows (gauge)
 * Labels: operation_type
 */
export const rateLimitActiveWindows = new Gauge({
  name: 'mastra_rate_limit_active_windows',
  help: 'Current number of active rate limit windows',
  labelNames: ['operation_type'] as const,
  registers: [register],
});

// ==================== System Health Metrics ====================

// Store agent start time for uptime calculation
const agentStartTime = Date.now();

/**
 * Mastra agent uptime in seconds (gauge)
 */
export const agentUptimeSeconds = new Gauge({
  name: 'mastra_agent_uptime_seconds',
  help: 'Mastra agent uptime in seconds',
  registers: [register],
  collect() {
    this.set((Date.now() - agentStartTime) / 1000);
  },
});

/**
 * Active conversations (gauge)
 */
export const activeConversations = new Gauge({
  name: 'mastra_active_conversations',
  help: 'Current number of active conversations',
  registers: [register],
});

/**
 * Total users with stored conversation memory
 */
export const usersWithMemoryTotal = new Gauge({
  name: 'mastra_users_with_memory_total',
  help: 'Total number of users with stored conversation memory',
  registers: [register],
});

// ==================== Helper Functions ====================

/**
 * Error types for metrics labeling
 */
export type ErrorType =
  | 'rate_limit'
  | 'agent_failure'
  | 'memory_unavailable'
  | 'mcp_timeout'
  | 'validation'
  | 'unknown';

/**
 * Operation types for chat requests
 */
export type OperationType = 'simple_query' | 'workflow' | 'voice';

/**
 * Query complexity classification
 */
export type QueryType = 'simple' | 'medium' | 'complex';

/**
 * Memory operation types
 */
export type MemoryOperation =
  | 'save_messages'
  | 'get_messages'
  | 'search_messages'
  | 'delete_messages';

/**
 * Workflow status types
 */
export type WorkflowStatus = 'completed' | 'failed' | 'timeout';

/**
 * Records a chat request with its operation type
 */
export function recordChatRequest(operationType: OperationType): void {
  chatRequestsTotal.inc({ operation_type: operationType });
}

/**
 * Records chat latency in milliseconds
 */
export function recordChatLatency(latencyMs: number): void {
  chatLatencyMs.observe(latencyMs);
}

/**
 * Records agent latency with query type classification
 */
export function recordAgentLatency(
  latencySeconds: number,
  queryType: QueryType = 'simple'
): void {
  agentLatencySeconds.observe({ query_type: queryType }, latencySeconds);
}

/**
 * Records a chat error by error type
 */
export function recordChatError(errorType: ErrorType): void {
  chatErrorsTotal.inc({ error_type: errorType });
  errorsTotal.inc({ error_type: errorType });
}

/**
 * Records token usage
 */
export function recordTokenUsage(
  model: string,
  promptTokens: number,
  completionTokens: number
): void {
  tokensUsedTotal.inc({ model, type: 'prompt' }, promptTokens);
  tokensUsedTotal.inc({ model, type: 'completion' }, completionTokens);
}

/**
 * Records a workflow execution
 */
export function recordWorkflowExecution(workflowName: string): void {
  workflowExecutionsTotal.inc({ workflow_name: workflowName });
}

/**
 * Records workflow duration in milliseconds
 */
export function recordWorkflowDuration(
  workflowName: string,
  durationMs: number
): void {
  workflowDurationMs.observe({ workflow_name: workflowName }, durationMs);
  workflowDurationSeconds.observe(
    { workflow_name: workflowName },
    durationMs / 1000
  );
}

/**
 * Records workflow completion status
 */
export function recordWorkflowStatus(status: WorkflowStatus): void {
  workflowStatusTotal.inc({ status });
}

/**
 * Records a workflow step duration
 */
export function recordWorkflowStepDuration(
  workflowName: string,
  stepName: string,
  durationMs: number
): void {
  workflowStepDurationMs.observe(
    { workflow_name: workflowName, step: stepName },
    durationMs
  );
  workflowStepDurationSeconds.observe(
    { workflow_name: workflowName, step_name: stepName },
    durationMs / 1000
  );
}

/**
 * Records a memory operation
 */
export function recordMemoryOperation(operation: MemoryOperation): void {
  memoryOperationsTotal.inc({ operation });

  // Also record in specific read/write counters
  if (operation === 'get_messages' || operation === 'search_messages') {
    memoryQueriesTotal.inc({ operation });
  } else {
    memoryWritesTotal.inc({ operation });
  }
}

/**
 * Records memory query latency
 */
export function recordMemoryQueryLatency(
  operation: MemoryOperation,
  latencyMs: number
): void {
  memoryQueryLatencyMs.observe({ operation }, latencyMs);
  memoryQueryDurationSeconds.observe({ operation }, latencyMs / 1000);
}

/**
 * Records a GDPR deletion request
 */
export function recordGdprDeletion(
  status: 'requested' | 'completed' | 'failed'
): void {
  memoryDeletionsTotal.inc({ status });
}

/**
 * Records GDPR deletion duration
 */
export function recordGdprDeletionDuration(durationMs: number): void {
  memoryDeletionDurationMs.observe(durationMs);
}

/**
 * Records a tool call
 */
export function recordToolCall(toolName: string): void {
  toolCallsTotal.inc({ tool_name: toolName });
}

/**
 * Records tool duration in seconds
 */
export function recordToolDuration(
  toolName: string,
  durationSeconds: number
): void {
  toolDurationSeconds.observe({ tool_name: toolName }, durationSeconds);
}

/**
 * Records an MCP tool call with status
 */
export function recordMcpToolCall(
  toolName: string,
  status: 'success' | 'error' | 'timeout'
): void {
  mcpToolCallsTotal.inc({ tool: toolName, status });
}

/**
 * Records MCP tool latency
 */
export function recordMcpToolLatency(
  toolName: string,
  latencyMs: number,
  transport: 'stdio' | 'http' = 'http'
): void {
  mcpToolLatencyMs.observe({ tool: toolName }, latencyMs);
  mcpToolDurationSeconds.observe(
    { tool_name: toolName, transport },
    latencyMs / 1000
  );
}

/**
 * Records an MCP tool error
 */
export function recordMcpToolError(
  toolName: string,
  errorType: string
): void {
  mcpToolErrorsTotal.inc({ tool: toolName, error_type: errorType });
}

/**
 * Records an MCP fallback event
 */
export function recordMcpFallback(
  toolName: string,
  reason: 'timeout' | 'error' | 'unavailable'
): void {
  mcpFallbackTotal.inc({ tool_name: toolName, reason });
}

/**
 * Voice provider types for transcription
 */
export type VoiceProvider = 'whisper' | 'vercel-ai-sdk' | 'elevenlabs';

/**
 * TTS model types (OpenAI and ElevenLabs)
 */
export type TTSModelType = 'tts-1' | 'tts-1-hd' | 'eleven_turbo_v2_5' | 'eleven_multilingual_v2';

/**
 * Records a voice transcription
 */
export function recordVoiceTranscription(
  provider: VoiceProvider,
  latencyMs: number,
  confidence: number
): void {
  voiceTranscriptionsTotal.inc({ provider });
  voiceTranscriptionLatencyMs.observe(latencyMs);
  voiceTranscriptionDurationSeconds.observe(latencyMs / 1000);
  voiceTranscriptionConfidence.observe(confidence);
}

/**
 * Records voice synthesis
 */
export function recordVoiceSynthesis(
  model: TTSModelType,
  latencyMs: number
): void {
  voiceSynthesisTotal.inc({ model });
  voiceSynthesisLatencyMs.observe({ model }, latencyMs);
  voiceSynthesisDurationSeconds.observe(latencyMs / 1000);
}

/**
 * Records end-to-end voice interaction latency
 */
export function recordVoiceEndToEnd(
  latencySeconds: number,
  queryType: QueryType = 'simple'
): void {
  voiceEndToEndDurationSeconds.observe({ query_type: queryType }, latencySeconds);
}

/**
 * Records a rate limit hit
 */
export function recordRateLimitHit(
  operationType: 'workflow' | 'voice'
): void {
  rateLimitHitsTotal.inc({ operation_type: operationType });
}

/**
 * Updates active rate limit windows count
 */
export function setActiveRateLimitWindows(
  operationType: 'workflow' | 'voice',
  count: number
): void {
  rateLimitActiveWindows.set({ operation_type: operationType }, count);
}

/**
 * Updates active conversations count
 */
export function setActiveConversations(count: number): void {
  activeConversations.set(count);
}

/**
 * Updates users with memory count
 */
export function setUsersWithMemory(count: number): void {
  usersWithMemoryTotal.set(count);
}

// ==================== Metrics Collection ====================

/**
 * Collects all metrics in Prometheus text format
 * Use this in the /api/mastra/metrics endpoint
 */
export async function collectMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Gets the content type for Prometheus response
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

/**
 * Classifies query complexity based on content
 * Used to label agent latency metrics
 */
export function classifyQuery(query: string): QueryType {
  const lowerQuery = query.toLowerCase();

  // Complex: multi-step workflows, planning, comparisons
  if (
    lowerQuery.includes('plan') ||
    lowerQuery.includes('workflow') ||
    lowerQuery.includes('compare') ||
    lowerQuery.includes('analyze')
  ) {
    return 'complex';
  }

  // Medium: searches, recommendations, lookups
  if (
    lowerQuery.includes('find') ||
    lowerQuery.includes('recommend') ||
    lowerQuery.includes('search') ||
    lowerQuery.includes('suggest')
  ) {
    return 'medium';
  }

  // Simple: basic queries
  return 'simple';
}

/**
 * Timer utility for measuring operation duration
 * Returns a function to call when the operation completes
 */
export function startTimer(): () => number {
  const startTime = process.hrtime.bigint();

  return (): number => {
    const endTime = process.hrtime.bigint();
    // Return duration in milliseconds
    return Number(endTime - startTime) / 1_000_000;
  };
}
