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
 * Integration: Called by streamMastraResponse() and the Studio agent wrapper.
 * This keeps the guardrails at the agent boundary rather than at the HTTP
 * layer alone, protecting against injection in any calling context.
 *
 * @see lib/mastra/mastra-agent.ts - streamMastraResponse integration
 * @see lib/mastra/log-sanitizer.ts - PII detection patterns reused here
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
 * - Role-play escape ("you are now", "act as")
 * - Delimiter injection ("###", "---" used as section breaks)
 *
 * NOTE: Patterns are intentionally broad to catch variations.
 * False positives are preferred over false negatives when the agent
 * has direct database access. The error message is generic to avoid
 * leaking detection logic to potential attackers.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // Direct instruction override
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS|PROMPTS?|CONTEXT)/i,
  /DISREGARD\s+(ALL\s+)?PREVIOUS/i,
  /FORGET\s+(ALL\s+)?(YOUR\s+)?(PREVIOUS\s+)?INSTRUCTIONS/i,
  /OVERRIDE\s+(SYSTEM|SAFETY|YOUR)\s+(PROMPT|INSTRUCTIONS|RULES)/i,

  // System prompt impersonation
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /<\|im_start\|>system/i,
  /SYSTEM:\s*you\s+are/i,

  // Jailbreak / DAN patterns
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /\bDo\s+Anything\s+Now\b/i,
  /\bdeveloper\s+mode\b/i,

  // Role-play escape attempts
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /act\s+as\s+(a|an|the)\s+(unrestricted|unfiltered|evil)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an)\s+(unrestricted|unfiltered)/i,

  // Delimiter injection (used to break out of user message context)
  /^#{3,}\s*SYSTEM/im,

  // Direct data exfiltration attempts via the SQL tool
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE\s+TABLE/i,
  /ALTER\s+TABLE/i,
  /INSERT\s+INTO.*VALUES/i,
  /UPDATE\s+\w+\s+SET/i,

  // Prompt leaking attempts
  /repeat\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt|rules)/i,
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
// Stream Transform — afterGenerate for streaming responses
// =============================================================================

/**
 * Creates a TransformStream that applies PII sanitization to text chunks.
 *
 * For streaming responses, PII patterns might span chunk boundaries.
 * This transform uses a small buffer (128 chars) to catch patterns that
 * straddle two chunks. The buffer is flushed when the stream ends.
 *
 * @param userId - User ID for logging context
 * @param conversationId - Conversation ID for logging context
 * @returns TransformStream<string, string> that sanitizes text chunks
 */
export function createOutputSanitizationStream(
  userId?: string,
  conversationId?: string,
): TransformStream<string, string> {
  // Buffer to hold trailing characters that might be part of a cross-chunk PII pattern
  const BUFFER_SIZE = 128;
  let buffer = '';

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      // Concatenate buffer with new chunk
      const combined = buffer + chunk;

      if (combined.length <= BUFFER_SIZE) {
        // Not enough data to flush — keep buffering
        buffer = combined;
        return;
      }

      // Flush everything except the trailing buffer
      const flushEnd = combined.length - BUFFER_SIZE;
      const toFlush = combined.slice(0, flushEnd);
      buffer = combined.slice(flushEnd);

      const result = afterGenerate(toFlush, userId, conversationId);
      controller.enqueue(result.sanitizedText);
    },

    flush(controller) {
      // Flush remaining buffer
      if (buffer.length > 0) {
        const result = afterGenerate(buffer, userId, conversationId);
        controller.enqueue(result.sanitizedText);
        buffer = '';
      }
    },
  });
}

// =============================================================================
// Exported Constants (for testing)
// =============================================================================

export { MAX_MESSAGE_LENGTH, INJECTION_PATTERNS };
