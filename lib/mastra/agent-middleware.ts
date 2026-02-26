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
 * createSanitizedTextStream:
 *   - Wraps a streaming text response with per-chunk PII sanitization
 *   - Maintains a trailing buffer to catch PII patterns spanning chunk boundaries
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
 * Buffer size for cross-chunk PII pattern detection in the output stream.
 * Large enough to catch most PII patterns (emails, phone numbers, SSNs)
 * but small enough to avoid noticeable streaming latency for long responses.
 */
const OUTPUT_BUFFER_SIZE = 128;

/**
 * Patterns that indicate prompt injection attempts.
 *
 * These cover common techniques:
 * - Direct instruction override ("ignore previous instructions")
 * - System prompt impersonation ("[SYSTEM]:", "<|system|>")
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
 *
 * SECURITY NOTE: These patterns are heuristic defenses, not cryptographic
 * guarantees. Known limitations:
 * - Non-standard Unicode whitespace variants (\u00A0, \u2009, zero-width
 *   joiners) and homoglyph substitutions (e.g. Cyrillic А vs Latin A) can
 *   bypass \s+ matches in some patterns.
 * - Obfuscation via encoding, character splitting, or multi-step prompts
 *   may evade individual pattern matches.
 * Defense-in-depth strategy: this layer filters obvious/common attacks.
 * The agent's system prompt is the primary trust boundary for sophisticated
 * evasion attempts. Future maintainers should treat these patterns as a
 * best-effort heuristic layer, not an impenetrable filter.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // Direct instruction override
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS|PROMPTS?|CONTEXT)/i,
  /DISREGARD\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS|CONTEXT|RULES)/i,
  /FORGET\s+(ALL\s+)?(YOUR\s+)?(PREVIOUS\s+)?INSTRUCTIONS/i,
  /OVERRIDE\s+(SYSTEM|SAFETY|YOUR)\s+(PROMPT|INSTRUCTIONS|RULES)/i,

  // System prompt impersonation (LLM-specific delimiters).
  // Anchored to line-start + separator (:, |) to avoid matching everyday
  // uses like "my [system] is crashing" or quoted Llama 2 documentation.
  /^\[SYSTEM\]\s*[:|]/im,
  /^\[INST\]\s/im,
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

  // Common injection sentence templates (frequently observed in public jailbreak datasets).
  // Each pattern requires an action verb / adversarial marker to reduce false-positive risk:
  //   1. "From now on, you will act…" — requires one of: act/behave/respond/pretend/ignore
  //      ("From now on, you will need a bigger tent" is NOT blocked — "need" is not in the list)
  //   2. "Your new instructions are:" — requires a trailing colon or dash to distinguish
  //      command syntax from natural references like "your new instructions are clear"
  //   3. "New context: You are" — the colon+phrase is a strong adversarial signal with very
  //      low legitimate use in a gear-discussion context
  /FROM\s+NOW\s+ON[\s,]+YOU\s+(WILL|SHALL|MUST)\s+(ACT|BEHAVE|RESPOND|PRETEND|IGNORE)/i,
  /YOUR\s+NEW\s+INSTRUCTIONS\s+ARE\s*[:\-]/i,
  /NEW\s+CONTEXT\s*:\s*YOU\s+ARE/i,
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

/**
 * Result of afterGenerate sanitization.
 * Note: `hadPII` is intentionally omitted — callers can derive it as
 * `redactionCount > 0` when they need a boolean check.
 */
export interface AfterGenerateResult {
  /** Sanitized output text */
  sanitizedText: string;
  /** Number of PII redactions applied */
  redactionCount: number;
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
 * @returns Sanitized text with PII redacted and a count of redactions made
 */
export function afterGenerate(
  text: string,
  userId?: string,
  conversationId?: string,
): AfterGenerateResult {
  // `!text` covers both empty string (falsy) and any unexpected null-like value.
  // The `text.length === 0` check would be redundant since empty string is already falsy.
  if (!text) {
    return { sanitizedText: text, redactionCount: 0 };
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
  };
}

// =============================================================================
// createSanitizedTextStream — Streaming Output Sanitization
// =============================================================================

/**
 * Wraps an async iterable text stream with PII sanitization.
 *
 * Strategy: maintain a trailing buffer of OUTPUT_BUFFER_SIZE chars to catch
 * PII patterns that span chunk boundaries (e.g. an email split across two
 * chunks). On each incoming chunk:
 *   1. Append to buffer.
 *   2. If buffer exceeds OUTPUT_BUFFER_SIZE: flush everything except the
 *      trailing OUTPUT_BUFFER_SIZE chars (which act as the overlap window).
 *   3. At stream end: flush the remaining buffer.
 *
 * For responses shorter than OUTPUT_BUFFER_SIZE the entire response is
 * buffered and flushed at stream end — this is intentional and avoids
 * yielding partial PII patterns. For typical short responses (< 128 chars)
 * the end-of-stream flush arrives quickly so UX impact is negligible.
 *
 * KNOWN LIMITATION — flush-boundary PII split:
 *   A PII pattern that straddles the exact flush boundary
 *   (i.e. starts inside `toFlush` and ends inside the retained `buffer`)
 *   will be split across two `afterGenerate` calls, and neither half
 *   constitutes a recognisable PII token on its own, so the pattern may
 *   not be redacted.  Example: a 16-char email starting 4 chars before
 *   the flush point will have "user" in `toFlush` and "@example.com" in
 *   the next buffer segment — neither is a valid email address alone.
 *   For the PII sizes covered (email ≤ ~40 chars, SSN = 11 chars,
 *   IPv4 = 15 chars) this requires the pattern to land within the last
 *   OUTPUT_BUFFER_SIZE chars of `toFlush`, which is unlikely in practice.
 *   This layer is a defense-in-depth heuristic; the agent's system prompt
 *   remains the primary trust boundary.
 *
 * @param textStream - Original text stream from agent
 * @param userId - User ID for logging context
 * @param conversationId - Conversation ID for logging context
 */
export async function* createSanitizedTextStream(
  textStream: AsyncIterable<string>,
  userId: string,
  conversationId: string,
): AsyncIterable<string> {
  let buffer = '';

  for await (const chunk of textStream) {
    buffer += chunk;

    if (buffer.length > OUTPUT_BUFFER_SIZE) {
      // Keep trailing OUTPUT_BUFFER_SIZE chars as the cross-chunk overlap window
      const toFlush = buffer.slice(0, -OUTPUT_BUFFER_SIZE);
      buffer = buffer.slice(-OUTPUT_BUFFER_SIZE);

      const result = afterGenerate(toFlush, userId, conversationId);
      yield result.sanitizedText;
    }
  }

  // Flush remaining buffer at stream end
  if (buffer.length > 0) {
    const result = afterGenerate(buffer, userId, conversationId);
    yield result.sanitizedText;
  }
}

// =============================================================================
// Exported Constants (for testing)
// =============================================================================

export { MAX_MESSAGE_LENGTH, INJECTION_PATTERNS, OUTPUT_BUFFER_SIZE };
