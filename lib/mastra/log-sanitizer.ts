/**
 * PII Sanitization for Structured Logs
 * Task: T020
 * Location: lib/mastra/log-sanitizer.ts
 *
 * Detects and redacts personally identifiable information (PII)
 * from log entries to ensure privacy compliance and data protection.
 *
 * Supported PII patterns:
 * - Email addresses
 * - Phone numbers (international formats)
 * - Credit card numbers (major card brands)
 * - API keys and tokens (common patterns)
 * - Social Security Numbers (US format)
 * - IP addresses (IPv4 and IPv6)
 */

// =====================================================
// Types
// =====================================================

/** Pattern types for options (camelCase for API consistency) */
export type PatternKey =
  | 'email'
  | 'phone'
  | 'creditCard'
  | 'apiKey'
  | 'ssn'
  | 'ipAddress';

/** Internal PII type identifiers (snake_case for logging consistency) */
export type PIIType =
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'api_key'
  | 'ssn'
  | 'ip_address'
  | 'sensitive_key';

export interface SanitizerOptions {
  /** Replacement string for redacted content */
  redactionText?: string;
  /** Enable/disable specific PII detection patterns */
  patterns?: Partial<Record<PatternKey, boolean>>;
  /** Keys to always redact regardless of pattern matching */
  sensitiveKeys?: string[];
  /** Preserve partial data (e.g., show last 4 digits of card) */
  preservePartial?: boolean;
}

export interface SanitizationResult {
  /** The sanitized data */
  sanitized: unknown;
  /** Count of redactions made */
  redactionCount: number;
  /** Types of PII detected */
  detectedTypes: PIIType[];
}

// =====================================================
// Pattern Key to PIIType Mapping
// =====================================================

/** Maps option pattern keys to internal PIIType identifiers */
const PATTERN_KEY_TO_PII_TYPE: Record<PatternKey, PIIType> = {
  email: 'email',
  phone: 'phone',
  creditCard: 'credit_card',
  apiKey: 'api_key',
  ssn: 'ssn',
  ipAddress: 'ip_address',
};

// =====================================================
// PII Detection Patterns
// =====================================================

/**
 * Comprehensive regex patterns for detecting PII in text.
 * Patterns are designed to minimize false positives while
 * catching common formats.
 */
const PII_PATTERNS: Record<PIIType, RegExp> = {
  // RFC 5322 simplified email pattern
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // International phone formats: +1-234-567-8900, (123) 456-7890, etc.
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,6}\b/g,

  // Major credit card formats (Visa, MasterCard, Amex, Discover)
  // Matches: 4111-1111-1111-1111, 4111 1111 1111 1111, 4111111111111111
  credit_card:
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})[-\s]?(?:[0-9]{4}[-\s]?){0,3}[0-9]{1,4}\b/g,

  // Common API key patterns (various providers)
  // Matches: sk_live_xxx, pk_test_xxx, AKIA..., ghp_..., etc.
  api_key:
    /\b(?:sk_(?:live|test)_[A-Za-z0-9]{24,}|pk_(?:live|test)_[A-Za-z0-9]{24,}|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9]{22,}|xox[baprs]-[A-Za-z0-9-]{10,}|Bearer\s+[A-Za-z0-9._~+\/-]+=*|api[_-]?key[=:]\s*[A-Za-z0-9._~+\/-]{16,})\b/gi,

  // US Social Security Number: XXX-XX-XXXX
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // IPv4 and IPv6 addresses
  ip_address:
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,

  // Placeholder for sensitive key detection (handled separately)
  sensitive_key: /(?:)/g,
};

/**
 * Default keys that should always be redacted regardless of content.
 * These are common field names that typically contain sensitive data.
 */
const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  'password',
  'passwd',
  'secret',
  'token',
  'auth',
  'authorization',
  'apiKey',
  'api_key',
  'apikey',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'secretKey',
  'secret_key',
  'credential',
  'credentials',
  'ssn',
  'social_security',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'pin',
] as const;

// =====================================================
// Default Options
// =====================================================

const DEFAULT_PATTERNS: Record<PatternKey, boolean> = {
  email: true,
  phone: true,
  creditCard: true,
  apiKey: true,
  ssn: true,
  ipAddress: true,
};

const DEFAULT_OPTIONS: Required<SanitizerOptions> = {
  redactionText: '[REDACTED]',
  patterns: DEFAULT_PATTERNS,
  sensitiveKeys: [...DEFAULT_SENSITIVE_KEYS],
  preservePartial: false,
};

// =====================================================
// Sanitization Functions
// =====================================================

/**
 * Sanitizes a string by detecting and redacting PII patterns.
 *
 * @param input - The string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string with PII redacted
 */
export function sanitizeString(
  input: string,
  options: SanitizerOptions = {}
): { sanitized: string; redactionCount: number; detectedTypes: PIIType[] } {
  const opts = mergeOptions(options);
  let result = input;
  let redactionCount = 0;
  const detectedTypes: Set<PIIType> = new Set();

  // Process each enabled pattern
  const patternKeys = Object.keys(opts.patterns) as PatternKey[];

  for (const patternKey of patternKeys) {
    const enabled = opts.patterns[patternKey];
    if (!enabled) continue;

    const piiType = PATTERN_KEY_TO_PII_TYPE[patternKey];
    const pattern = PII_PATTERNS[piiType];
    if (!pattern) continue;

    // Create a fresh regex instance for each match
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = result.match(regex);

    if (matches && matches.length > 0) {
      detectedTypes.add(piiType);
      redactionCount += matches.length;

      // Apply partial preservation if enabled
      if (opts.preservePartial && piiType === 'credit_card') {
        result = result.replace(regex, (match) => {
          const digits = match.replace(/\D/g, '');
          const lastFour = digits.slice(-4);
          return `${opts.redactionText.slice(0, -1)}-****-****-${lastFour}]`;
        });
      } else if (opts.preservePartial && piiType === 'email') {
        result = result.replace(regex, (match) => {
          const [localPart, domain] = match.split('@');
          if (localPart && localPart.length > 2) {
            return `${localPart[0]}***@${domain}`;
          }
          return opts.redactionText;
        });
      } else {
        result = result.replace(regex, opts.redactionText);
      }
    }
  }

  return { sanitized: result, redactionCount, detectedTypes: Array.from(detectedTypes) };
}

/**
 * Sanitizes an object by recursively processing all string values
 * and redacting sensitive keys.
 *
 * @param input - The object to sanitize
 * @param options - Sanitization options
 * @returns A new sanitized object (original is not modified)
 */
export function sanitizeObject<T>(
  input: T,
  options: SanitizerOptions = {}
): { sanitized: T; redactionCount: number; detectedTypes: PIIType[] } {
  const opts = mergeOptions(options);
  let totalRedactions = 0;
  const detectedTypes: Set<PIIType> = new Set();

  function processValue(value: unknown, key?: string): unknown {
    // Check if key is sensitive
    if (key && isSensitiveKey(key, opts.sensitiveKeys)) {
      if (value !== null && value !== undefined) {
        totalRedactions++;
        detectedTypes.add('sensitive_key');
        return opts.redactionText;
      }
    }

    // Handle different value types
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      const result = sanitizeString(value, opts);
      totalRedactions += result.redactionCount;
      result.detectedTypes.forEach((type) => detectedTypes.add(type));
      return result.sanitized;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => processValue(item, String(index)));
    }

    if (typeof value === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [objKey, objValue] of Object.entries(value as Record<string, unknown>)) {
        sanitizedObj[objKey] = processValue(objValue, objKey);
      }
      return sanitizedObj;
    }

    // Primitives (numbers, booleans) pass through unchanged
    return value;
  }

  const sanitized = processValue(input) as T;

  return {
    sanitized,
    redactionCount: totalRedactions,
    detectedTypes: Array.from(detectedTypes),
  };
}

/**
 * Main PII sanitization function.
 * Automatically detects input type (string or object) and applies
 * appropriate sanitization.
 *
 * @param input - The data to sanitize (string or object)
 * @param options - Sanitization options
 * @returns Sanitized data with the same type as input
 *
 * @example
 * ```ts
 * // String sanitization
 * const result = sanitizePII("Contact: user@example.com");
 * console.log(result.sanitized); // "Contact: [REDACTED]"
 *
 * // Object sanitization
 * const result = sanitizePII({
 *   user: { email: "test@example.com", password: "secret123" }
 * });
 * // { user: { email: "[REDACTED]", password: "[REDACTED]" } }
 * ```
 */
export function sanitizePII<T>(input: T, options: SanitizerOptions = {}): SanitizationResult {
  if (typeof input === 'string') {
    const result = sanitizeString(input, options);
    return {
      sanitized: result.sanitized,
      redactionCount: result.redactionCount,
      detectedTypes: result.detectedTypes,
    };
  }

  if (typeof input === 'object' && input !== null) {
    return sanitizeObject(input, options);
  }

  // For primitives (number, boolean, null, undefined), return as-is
  return {
    sanitized: input,
    redactionCount: 0,
    detectedTypes: [],
  };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Merges user options with defaults.
 */
function mergeOptions(options: SanitizerOptions): Required<SanitizerOptions> {
  return {
    redactionText: options.redactionText ?? DEFAULT_OPTIONS.redactionText,
    patterns: {
      ...DEFAULT_OPTIONS.patterns,
      ...options.patterns,
    },
    sensitiveKeys: options.sensitiveKeys ?? DEFAULT_OPTIONS.sensitiveKeys,
    preservePartial: options.preservePartial ?? DEFAULT_OPTIONS.preservePartial,
  };
}

/**
 * Checks if a key name matches any sensitive key pattern.
 * Performs case-insensitive matching.
 */
function isSensitiveKey(key: string, sensitiveKeys: string[]): boolean {
  const normalizedKey = key.toLowerCase();
  return sensitiveKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey.toLowerCase()));
}

// =====================================================
// Specialized Sanitizers
// =====================================================

/**
 * Creates a pre-configured sanitizer for use in logging modules.
 * Returns a simpler function that just takes data and returns sanitized data.
 *
 * @param options - Default options for all sanitizations
 * @returns A configured sanitizer function
 *
 * @example
 * ```ts
 * const sanitize = createLogSanitizer({ preservePartial: true });
 *
 * logger.info('User action', sanitize({ email: 'user@test.com' }).sanitized);
 * ```
 */
export function createLogSanitizer(
  options: SanitizerOptions = {}
): (input: unknown) => SanitizationResult {
  return (input: unknown) => sanitizePII(input, options);
}

/**
 * Sanitizes an error object for safe logging.
 * Preserves error structure while redacting PII from message and stack.
 *
 * @param error - The error to sanitize
 * @param options - Sanitization options
 * @returns Sanitized error-like object
 */
export function sanitizeError(
  error: Error,
  options: SanitizerOptions = {}
): {
  name: string;
  message: string;
  stack?: string;
  redactionCount: number;
  detectedTypes: PIIType[];
} {
  const opts = mergeOptions(options);
  let redactionCount = 0;
  const detectedTypes: Set<PIIType> = new Set();

  const messageResult = sanitizeString(error.message, opts);
  redactionCount += messageResult.redactionCount;
  messageResult.detectedTypes.forEach((type) => detectedTypes.add(type));

  let sanitizedStack: string | undefined;
  if (error.stack) {
    const stackResult = sanitizeString(error.stack, opts);
    redactionCount += stackResult.redactionCount;
    stackResult.detectedTypes.forEach((type) => detectedTypes.add(type));
    sanitizedStack = stackResult.sanitized;
  }

  return {
    name: error.name,
    message: messageResult.sanitized,
    stack: sanitizedStack,
    redactionCount,
    detectedTypes: Array.from(detectedTypes),
  };
}

/**
 * Quick check to determine if a string contains any PII.
 * Useful for conditional logging or routing.
 *
 * @param input - String to check
 * @param options - Sanitization options (only pattern settings used)
 * @returns true if any PII patterns are detected
 */
export function containsPII(input: string, options: SanitizerOptions = {}): boolean {
  const opts = mergeOptions(options);

  const patternKeys = Object.keys(opts.patterns) as PatternKey[];

  for (const patternKey of patternKeys) {
    const enabled = opts.patterns[patternKey];
    if (!enabled) continue;

    const piiType = PATTERN_KEY_TO_PII_TYPE[patternKey];
    const pattern = PII_PATTERNS[piiType];
    if (!pattern) continue;

    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(input)) {
      return true;
    }
  }

  return false;
}

// =====================================================
// Re-export types for external use
// =====================================================

export { DEFAULT_SENSITIVE_KEYS };
