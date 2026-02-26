/**
 * Agent Middleware for Guardrails (beforeGenerate / afterGenerate)
 *
 * Defense-in-depth layer between user input and the Mastra Agent.
 * The agent has direct DB access via queryUserDataSqlTool and
 * write access via addToLoadoutTool, making input sanitization critical.
 *
 * beforeGenerate:
 *   - Prompt injection detection (pattern-based)
 *   - Message length enforcement (truncation)
 *
 * afterGenerate:
 *   - PII redaction from agent responses (reuses log-sanitizer patterns)
 *
 * Integration: Called by streamMastraResponse() in mastra-agent.ts.
 * This keeps the guardrails at the agent boundary rather than at the HTTP
 * layer alone, protecting against injection in any calling context.
 *
 * NOTE: SQL injection is NOT checked here — queryUserDataSqlTool has its own
 * DANGEROUS_SQL_KEYWORDS validation at the tool boundary, which is the correct
 * place because it validates the actual SQL WHERE clause, not natural language.
 *
 * @see lib/mastra/mastra-agent.ts - streamMastraResponse integration
 * @see lib/mastra/log-sanitizer.ts - PII detection patterns reused here
 * @see lib/mastra/tools/query-user-data-sql.ts - SQL injection protection
 */

import { sanitizeString } from './log-sanitizer';
import { logWarn, logInfo } from './logging';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum allowed message length at the agent boundary.
 * The HTTP route validates at 10,000 chars; this is a tighter inner limit
 * to reduce token cost and limit attack surface for injection payloads.
 */
const MAX_MESSAGE_LENGTH = 5000;

/**
 * Patterns that indicate prompt injection attempts.
 *
 * These cover common techniques:
 * - Direct instruction override ("ignore previous instructions")
 * - System prompt impersonation ("[SYSTEM]", "<|system|>")
 * - Jailbreak keywords
 * - Role-play escape ("you are now an unrestricted...")
 * - Delimiter injection ("### SYSTEM" used to break context)
 *
 * Design decisions:
 * - SQL injection is NOT checked here — queryUserDataSqlTool validates
 *   at the tool boundary where it can distinguish SQL from natural language.
 *   Blocking "delete from" at the message level would reject "Can I delete
 *   from my loadout?" which is a legitimate user question.
 * - Patterns target adversarial structures, not everyday vocabulary.
 *   "developer mode" alone is too broad; we match the phrase in injection
 *   context ("enable developer mode", "switch to developer mode").
 * - The error message is generic to avoid leaking detection logic.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // Direct instruction override
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS|PROMPTS?|CONTEXT)/i,
  /DISREGARD\s+(ALL\s+)?PREVIOUS/i,
  /FORGET\s+(ALL\s+)?(YOUR\s+)?(PREVIOUS\s+)?INSTRUCTIONS/i,
  /OVERRIDE\s+(SYSTEM|SAFETY|YOUR)\s+(PROMPT|INSTRUCTIONS|RULES)/i,

  // System prompt impersonation (LLM-specific delimiters)
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /<\|im_start\|>system/i,
  /SYSTEM:\s*you\s+are/i,

  // Jailbreak / DAN patterns
  /\bDAN\s+mode\b/i,
  /\bDo\s+Anything\s+Now\b/i,
  /\b(enable|switch\s+to|activate|enter)\s+developer\s+mode\b/i,

  // Role-play escape attempts (require "unrestricted"/"unfiltered"/"evil" qualifier)
  /act\s+as\s+(a|an|the)\s+(unrestricted|unfiltered|evil)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an)\s+(unrestricted|unfiltered)/i,

  // Delimiter injection (used to break out of user message context)
  /^#{3,}\s*SYSTEM/im,

  // Prompt leaking attempts (require "system prompt" as a phrase)
  /repeat\s+(your|the)\s+system\s+prompt/i,
  /show\s+(me\s+)?(your|the)\s+system\s+prompt/i,
  /what\s+(are|is)\s+your\s+system\s+(instructions|prompt)/i,
  /(print|output|reveal|display)\s+(your|the)\s+system\s+prompt/i,
];

// =============================================================================
// Types
// =============================================================================

/** Result of beforeGenerate validation */
export interface BeforeGenerateResult {
  /** Whether the message passed validation */
  allowed: boolean;
  /** Sanitized/truncated message (only when allowed=true) */
  sanitizedMessage?: string;
  /** Rejection reason (only when allowed=false) */
  rejectionReason?: string;
  /** Whether the message was truncated */
  wasTruncated: boolean;
  /** Detected injection patterns (for logging, not exposed to user) */
  detectedPatterns: string[];
}

/** Result of afterGenerate sanitization */
export interface AfterGenerateResult {
  /** Sanitized output text */
  sanitizedText: string;
  /** Number of PII redactions applied */
  redactionCount: number;
  /** Whether any PII was detected and redacted */
  hadPII: boolean;
}

// =============================================================================
// beforeGenerate — Input Validation & Sanitization
// =============================================================================

/**
 * Validates and sanitizes user input before it reaches the agent.
 *
 * Checks performed (in order):
 * 1. Prompt injection detection — rejects messages matching known patterns
 * 2. Message length enforcement — truncates to MAX_MESSAGE_LENGTH
 *
 * @param message - Raw user message
 * @param userId - User ID for logging context
 * @param conversationId - Conversation ID for logging context
 * @returns Validation result with sanitized message or rejection reason
 */
export function beforeGenerate(
  message: string,
  userId?: string,
  conversationId?: string,
): BeforeGenerateResult {
  const detectedPatterns: string[] = [];

  // --- Step 1: Prompt Injection Detection ---
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      detectedPatterns.push(pattern.source);
    }
  }

  if (detectedPatterns.length > 0) {
    logWarn('[Agent Middleware] Prompt injection detected — message blocked', {
      userId,
      conversationId,
      metadata: {
        patternCount: detectedPatterns.length,
        // Log pattern sources for investigation but NEVER the message content
        // (it may contain additional malicious payloads)
        patterns: detectedPatterns.slice(0, 3), // Limit to first 3
        messageLength: message.length,
      },
    });

    return {
      allowed: false,
      rejectionReason: 'Message blocked by safety filter',
      wasTruncated: false,
      detectedPatterns,
    };
  }

  // --- Step 2: Message Length Enforcement ---
  let sanitizedMessage = message;
  let wasTruncated = false;

  if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
    sanitizedMessage = sanitizedMessage.slice(0, MAX_MESSAGE_LENGTH);
    wasTruncated = true;

    logInfo('[Agent Middleware] Message truncated to agent limit', {
      userId,
      conversationId,
      metadata: {
        originalLength: message.length,
        truncatedLength: MAX_MESSAGE_LENGTH,
      },
    });
  }

  return {
    allowed: true,
    sanitizedMessage,
    wasTruncated,
    detectedPatterns: [],
  };
}

// =============================================================================
// afterGenerate — Output Sanitization
// =============================================================================

/**
 * Sanitizes agent output to remove PII before it reaches the client.
 *
 * This is a defense-in-depth measure: the agent's system prompt instructs
 * it not to reveal other users' PII, but the LLM is non-deterministic.
 * This guardrail catches any PII that slips through.
 *
 * Reuses the battle-tested PII detection patterns from log-sanitizer.ts
 * (email, phone, credit card, SSN, API keys, IP addresses).
 *
 * @param text - Raw agent output text
 * @param userId - User ID for logging context
 * @param conversationId - Conversation ID for logging context
 * @returns Sanitized text with PII redacted
 */
export function afterGenerate(
  text: string,
  userId?: string,
  conversationId?: string,
): AfterGenerateResult {
  if (!text || text.length === 0) {
    return { sanitizedText: text, redactionCount: 0, hadPII: false };
  }

  const result = sanitizeString(text);

  if (result.redactionCount > 0) {
    logWarn('[Agent Middleware] PII detected in agent output — redacted', {
      userId,
      conversationId,
      metadata: {
        redactionCount: result.redactionCount,
        detectedTypes: result.detectedTypes,
        // Log text length but NEVER the actual content
        outputLength: text.length,
      },
    });
  }

  return {
    sanitizedText: result.sanitized,
    redactionCount: result.redactionCount,
    hadPII: result.redactionCount > 0,
  };
}

// =============================================================================
// Exported Constants (for testing)
// =============================================================================

export { MAX_MESSAGE_LENGTH, INJECTION_PATTERNS };
