/**
 * Mastra Agentic Voice AI Type Definitions
 * Feature: 001-mastra-agentic-voice
 *
 * This file defines all TypeScript interfaces for the Mastra integration,
 * including conversation memory, workflow execution, rate limiting, and GDPR compliance.
 */

// ==================== Core Database Entities ====================

/**
 * Conversation memory record
 * Stored in conversation_memory table
 */
export interface ConversationMemory {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  messageRole: 'user' | 'assistant' | 'system';
  messageContent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow execution record
 * Tracks multi-step workflow progress
 */
export interface WorkflowExecution {
  id: string;
  userId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  currentStep: string | null;
  stepResults: Record<string, unknown>;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
}

/**
 * Rate limit tracking record
 * Enforces tiered rate limits by operation type
 */
export interface RateLimitTracking {
  id: string;
  userId: string;
  operationType: 'simple_query' | 'workflow' | 'voice';
  requestCount: number;
  windowStart: Date;
  lastRequestAt: Date;
}

/**
 * GDPR deletion audit record
 * Tracks Right to Erasure requests
 */
export interface GdprDeletionRecord {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt: Date | null;
  recordsDeleted: number;
  errorMessage: string | null;
}

// ==================== Mastra Configuration Entities ====================

/**
 * Mastra agent configuration
 * Embedded in Next.js application
 */
export interface MastraAgent {
  name: string;
  model: string; // e.g., "gpt-4o-mini", "claude-3-5-sonnet"
  instructions: string; // System prompt with persona
  tools: MCPTool[];
  memory: {
    adapter: 'supabase';
    retentionDays: number; // 90 days
  };
  workflows?: WorkflowDefinition[];
  observability: {
    logging: {
      enabled: boolean;
      format: 'json';
      level: 'info' | 'debug' | 'warn' | 'error';
    };
    metrics: {
      enabled: boolean;
      endpoint: string; // e.g., "/api/mastra/metrics"
    };
    tracing: {
      enabled: boolean;
    };
  };
}

/**
 * MCP tool definition
 * Dynamically discovered from GearGraph MCP server
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  transport: 'stdio' | 'http';
  endpoint?: string; // For HTTP transport
}

/**
 * Workflow definition
 * Multi-step reasoning process
 */
export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  maxDurationMs: number; // Timeout threshold
}

/**
 * Individual workflow step
 * Can be sequential or parallel
 */
export interface WorkflowStep {
  id: string;
  type: 'tool_call' | 'llm_reasoning' | 'api_request' | 'parallel_group';
  dependencies: string[]; // Step IDs that must complete first
  config: Record<string, unknown>;
}

/**
 * Voice interaction session
 * Complete request-response cycle
 */
export interface VoiceInteractionSession {
  id: string;
  userId: string;
  audioUrl: string; // Uploaded audio file
  transcription: {
    text: string;
    confidence: number;
    provider: 'whisper' | 'vercel-ai-sdk';
  };
  aiResponse: {
    text: string;
    audioUrl: string; // TTS output
    latencyMs: number;
  };
  createdAt: Date;
}

/**
 * Memory correction event
 * User-initiated fact update
 */
export interface MemoryCorrectionEvent {
  id: string;
  userId: string;
  conversationId: string;
  correctionType: 'fact_update' | 'preference_change' | 'deletion';
  originalContent: string;
  correctedContent: string;
  createdAt: Date;
}

// ==================== API Request/Response Types ====================

/**
 * Chat API request body
 * POST /api/mastra/chat
 */
export interface MastraChatRequest {
  /** Conversation ID - null for new conversations (will be generated server-side) */
  conversationId: string | null;
  message: string;
  context?: Record<string, unknown>;
  enableTools?: boolean;
  enableVoice?: boolean;
}

/**
 * Confirm action data sent when a workflow suspends for user confirmation.
 * The frontend renders a confirmation card and the user can approve or cancel.
 * On approval, the frontend calls POST /api/mastra/workflows/add-gear/resume.
 */
export interface ConfirmActionData {
  /** Unique run ID for resuming the workflow */
  runId: string;
  /** Type of action requiring confirmation */
  actionType: 'add_to_loadout';
  /** Human-readable confirmation message */
  message: string;
  /** Details for UI rendering */
  details: {
    gearItemId: string;
    gearItemName: string;
    loadoutId: string;
    loadoutName: string;
  };
}

/**
 * Chat API SSE event types
 */
export type MastraChatEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; toolName: string; args: Record<string, unknown> }
  | { type: 'workflow_progress'; step: string; message: string }
  | { type: 'confirm_action'; confirmation: ConfirmActionData }
  | { type: 'done'; messageId: string }
  | { type: 'error'; message: string; code?: string };

/**
 * Confirm action data sent when a workflow suspends for user confirmation.
 * The frontend renders a confirmation card and the user can approve or cancel.
 * On approval, the frontend calls POST /api/mastra/workflows/add-gear/resume.
 */
export interface ConfirmActionData {
  /** Unique run ID for resuming the workflow */
  runId: string;
  /** Type of action requiring confirmation */
  actionType: 'add_to_loadout';
  /** Human-readable confirmation message */
  message: string;
  /** Details for UI rendering */
  details: {
    gearItemId: string;
    gearItemName: string;
    loadoutId: string;
    loadoutName: string;
  };
}

/**
 * Memory deletion request
 * POST /api/mastra/memory/delete
 */
export interface MemoryDeletionRequest {
  confirm: true;
}

/**
 * Memory deletion response
 * POST /api/mastra/memory/delete
 */
export interface MemoryDeletionResponse {
  deletionId: string;
  estimatedCompletionTime: Date;
}

/**
 * Voice transcription request
 * POST /api/mastra/voice/transcribe (FormData)
 */
export interface VoiceTranscriptionRequest {
  audio: File; // Audio file (WAV/MP3/WebM)
}

/**
 * Voice transcription response
 */
export interface VoiceTranscriptionResponse {
  text: string;
  confidence: number;
  language: string;
}

/**
 * TTS synthesis request
 * POST /api/mastra/voice/synthesize
 */
export interface TTSSynthesisRequest {
  text: string;
  voice?: string;
  language?: string;
}

/**
 * Rate limit error response
 */
export interface RateLimitError {
  error: {
    code: 'RATE_LIMIT_EXCEEDED';
    message: string;
    operationType: 'workflow' | 'voice';
    limit: number;
    resetAt: Date;
  };
}

// ==================== Workflow-Specific Types ====================

/**
 * Trip planner workflow input
 */
export interface TripPlannerInput {
  location: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  durationDays: number;
  maxWeightKg: number;
  constraints?: string[];
}

/**
 * Trip planner workflow output
 */
export interface TripPlannerOutput {
  environment: {
    temperature: { min: number; max: number };
    precipitation: number;
    terrain: string;
  };
  gearGaps: {
    category: string;
    reason: string;
    recommendations: string[];
  }[];
  plan: {
    description: string;
    totalWeight: number;
    costEstimate: number;
  };
}

/**
 * Workflow context
 * Passed between workflow steps
 */
export interface WorkflowContext {
  userId: string;
  executionId: string;
  input: Record<string, unknown>;
  stepResults: Record<string, unknown>;
  startedAt: Date;
}

// ==================== MCP Integration Types ====================

/**
 * MCP connection status
 */
export interface MCPConnectionStatus {
  connected: boolean;
  serverUrl: string;
  transport: 'stdio' | 'http';
  discoveredTools: string[];
  lastPingAt: Date | null;
  error: string | null;
}

/**
 * MCP tool execution result
 */
export interface MCPToolResult {
  toolName: string;
  result: unknown;
  latencyMs: number;
  error: string | null;
}

// ==================== Observability Types ====================

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  userId?: string;
  conversationId?: string;
  workflowId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Prometheus metric types
 */
export type PrometheusMetric =
  | { type: 'histogram'; name: string; value: number; labels?: Record<string, string> }
  | { type: 'counter'; name: string; value: number; labels?: Record<string, string> }
  | { type: 'gauge'; name: string; value: number; labels?: Record<string, string> };
