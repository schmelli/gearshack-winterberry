/**
 * Types for the Graph Gardener API integration
 * Base URL: https://geargraph.gearshack.app/gardener
 */

// ============================================================================
// Chat Types
// ============================================================================

export interface GardenerChatRequest {
  message: string;
  streamResponse?: boolean; // default: true
}

export interface GardenerChatResponse {
  message: string;
  toolCalls?: GardenerToolCall[];
  suggestions?: string[];
  timestamp: string;
}

export interface GardenerToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

// SSE Event Types
export type GardenerSSEEventType =
  | 'start'
  | 'chunk'
  | 'tools'
  | 'suggestions'
  | 'done';

export interface GardenerSSEEvent {
  type: GardenerSSEEventType;
  content?: string;
  toolCalls?: GardenerToolCall[];
  suggestions?: string[];
  timestamp?: string;
}

export interface GardenerChatHistory {
  history: GardenerChatMessage[];
  messageCount: number;
}

export interface GardenerChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: GardenerToolCall[];
  suggestions?: string[];
  timestamp?: string;
}

// ============================================================================
// System Status Types
// ============================================================================

export type GardenerHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface GardenerSystemStatus {
  status: GardenerHealthStatus;
  memgraphConnected: boolean;
  workflowsRunning: number;
  pendingApprovals: number;
  lastHygieneRun: string | null;
  lastDeduplicationRun: string | null;
  metrics: GardenerMetrics;
  timestamp: string;
}

export interface GardenerMetrics {
  totalNodes: number;
  totalRelationships: number;
  orphanCount: number;
  duplicatesDetected: number;
  mergesExecuted24h: number;
  deletions24h: number;
}

// ============================================================================
// Workflow Types
// ============================================================================

export type GardenerWorkflowStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'suspended';

export type GardenerWorkflowName =
  | 'morning-hygiene'
  | 'deep-deduplication'
  | 'gap-filling';

export type GardenerWorkflowPriority = 'normal' | 'high';

export interface GardenerWorkflowRun {
  id: string;
  workflowName: GardenerWorkflowName;
  status: GardenerWorkflowStatus;
  startedAt: string;
  completedAt?: string;
}

export interface GardenerWorkflowListResponse {
  runs: GardenerWorkflowRun[];
  total: number;
  pagination: GardenerPagination;
  statusCounts: Record<GardenerWorkflowStatus, number>;
  availableWorkflows: GardenerWorkflowName[];
}

export interface GardenerWorkflowTriggerRequest {
  workflowName: GardenerWorkflowName;
  scope?: {
    category?: string;
    brandId?: string;
  };
  priority?: GardenerWorkflowPriority;
}

export interface GardenerWorkflowTriggerResponse {
  runId: string;
  workflowName: GardenerWorkflowName;
  status: GardenerWorkflowStatus;
  triggeredAt: string;
  triggeredBy: string;
}

// ============================================================================
// Approval Types (Human-in-the-Loop)
// ============================================================================

export type GardenerApprovalStatus = 'pending' | 'approved' | 'rejected';
export type GardenerProposedAction = 'merge' | 'delete' | 'enrich';
export type GardenerApprovalDecision = 'approve' | 'reject';

export interface GardenerApprovalCandidate {
  nodeId: string;
  nodeName: string;
  nodeProperties: Record<string, unknown>;
  relationships: GardenerCandidateRelationship[];
}

export interface GardenerCandidateRelationship {
  type: string;
  direction: 'incoming' | 'outgoing';
  targetId: string;
  targetName: string;
}

export interface GardenerApproval {
  id: string;
  workflowRunId: string;
  stepId: string;
  proposedAction: GardenerProposedAction;
  candidates: GardenerApprovalCandidate[];
  reasoning: string;
  confidence: number;
  status: GardenerApprovalStatus;
  createdAt: string;
  conflictingProperties?: string[];
}

export interface GardenerApprovalListResponse {
  approvals: GardenerApproval[];
  pagination: GardenerPagination & { total: number; hasMore: boolean };
}

export interface GardenerApprovalDecisionRequest {
  stepId: string;
  decision: GardenerApprovalDecision;
  notes?: string;
  propertyResolutions?: Record<string, unknown>;
}

export interface GardenerApprovalDecisionResponse {
  workflowRunId: string;
  status: GardenerWorkflowStatus;
  message: string;
  result?: {
    action: string;
    details: Record<string, unknown>;
  };
  pendingApprovals: number;
}

// ============================================================================
// Issues Types
// ============================================================================

export type GardenerIssueType =
  | 'potential_duplicate'
  | 'orphan_node'
  | 'missing_data'
  | 'schema_violation'
  | 'manual_review';

export type GardenerIssueSeverity = 'info' | 'warning' | 'error';
export type GardenerIssueStatus = 'open' | 'resolved' | 'wont_fix';

export interface GardenerIssue {
  id: string;
  type: GardenerIssueType;
  severity: GardenerIssueSeverity;
  entities: string[];
  suggestedAction: string;
  confidence: number;
  status: GardenerIssueStatus;
  detectedAt: string;
}

export interface GardenerIssueListResponse {
  issues: GardenerIssue[];
  pagination: GardenerPagination;
  summary: {
    byType: Record<GardenerIssueType, number>;
    bySeverity: Record<GardenerIssueSeverity, number>;
    openCount: number;
  };
}

export interface GardenerIssueResolveRequest {
  issueId: string;
  status: 'resolved' | 'wont_fix';
  resolution: string;
  resolvedBy: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export type GardenerAuditAction = 'merge' | 'delete' | 'enrich' | 'create';

export interface GardenerAuditEntry {
  id: string;
  timestamp: string;
  action: GardenerAuditAction;
  entityId: string;
  entityType: string;
  workflowRunId?: string;
  reasoning: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface GardenerAuditListResponse {
  entries: GardenerAuditEntry[];
  pagination: GardenerPagination;
  summary: {
    totalActions: number;
    byAction: Record<GardenerAuditAction, number>;
  };
}

// ============================================================================
// Common Types
// ============================================================================

export interface GardenerPagination {
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export interface GardenerError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Error codes
export type GardenerErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'WORKFLOW_ALREADY_RUNNING'
  | 'INTERNAL_ERROR';

// ============================================================================
// Hook Types
// ============================================================================

export interface UseGardenerChatState {
  messages: GardenerChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
  systemStatus: GardenerSystemStatus | null;
}

export interface UseGardenerChatActions {
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  selectSuggestion: (suggestion: string) => void;
}

export type UseGardenerChatReturn = UseGardenerChatState & UseGardenerChatActions;
