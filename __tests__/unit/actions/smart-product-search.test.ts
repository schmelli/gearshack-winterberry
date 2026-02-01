/**
 * Smart Product Search Tests
 *
 * Feature: 054-url-import-enhancement
 *
 * Tests for the smart product search action, focusing on:
 * - Price parsing for German (DE) and English (EN) formats
 * - URL validation (SSRF protection)
 * - Weight parsing utilities
 *
 * Note: The parsePrice and validateExtractionUrl functions are internal
 * to the action file. We test them indirectly through the exported functions
 * or by extracting and testing the parsing logic patterns.
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Price Parsing Logic Tests
// =============================================================================

/**
 * Replicated parsePrice function for testing purposes.
 * This matches the implementation in smart-product-search.ts
 */
function parsePrice(text: string): { value: number; currency: string } | null {
  // Detect currency from text fragment
  const detectCurrency = (str: string): string => {
    const upperStr = str.toUpperCase();
    if (str.includes('$') || upperStr.includes('USD')) return 'USD';
    if (str.includes('\u20AC') || upperStr.includes('EUR')) return 'EUR';
    if (str.includes('\u00A3') || upperStr.includes('GBP')) return 'GBP';
    if (upperStr.includes('CHF')) return 'CHF';
    return 'USD'; // Default fallback
  };

  // Determine if currency typically uses German format (comma as decimal separator)
  const isGermanFormatCurrency = (currency: string): boolean => {
    return ['EUR', 'CHF'].includes(currency);
  };

  // Pattern to match price-like strings with various formats
  const pricePattern =
    /(?:[$\u20AC\u00A3]|USD|EUR|GBP|CHF)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:[$\u20AC\u00A3]|USD|EUR|GBP|CHF)?/gi;

  let match;
  while ((match = pricePattern.exec(text)) !== null) {
    const fullMatch = match[0].trim();
    const numberPart = match[1];

    if (!numberPart) continue;

    // Skip if no currency indicator in the match
    const hasCurrencyIndicator =
      fullMatch.includes('$') ||
      fullMatch.includes('\u20AC') ||
      fullMatch.includes('\u00A3') ||
      /USD|EUR|GBP|CHF/i.test(fullMatch);

    if (!hasCurrencyIndicator) continue;

    // Detect currency early for ambiguous format resolution
    const currency = detectCurrency(fullMatch);
    const preferGermanFormat = isGermanFormatCurrency(currency);

    // Determine if this is German or English format by analyzing the last separator
    const lastCommaIndex = numberPart.lastIndexOf(',');
    const lastPeriodIndex = numberPart.lastIndexOf('.');
    const hasComma = lastCommaIndex !== -1;
    const hasPeriod = lastPeriodIndex !== -1;

    let normalizedValue: number;

    if (hasComma && hasPeriod) {
      // Both separators present - use position-based detection
      if (lastCommaIndex > lastPeriodIndex) {
        // Last separator is comma - German format
        const afterComma = numberPart.slice(lastCommaIndex + 1);
        if (afterComma.length === 2 && /^\d{2}$/.test(afterComma)) {
          const cleaned = numberPart.replace(/\./g, '').replace(',', '.');
          normalizedValue = parseFloat(cleaned);
        } else {
          const cleaned = numberPart.replace(/,/g, '');
          normalizedValue = parseFloat(cleaned);
        }
      } else {
        // Last separator is period - English format
        const afterPeriod = numberPart.slice(lastPeriodIndex + 1);
        if (afterPeriod.length === 2 && /^\d{2}$/.test(afterPeriod)) {
          const cleaned = numberPart.replace(/,/g, '');
          normalizedValue = parseFloat(cleaned);
        } else {
          const cleaned = numberPart.replace(/\./g, '');
          normalizedValue = parseFloat(cleaned);
        }
      }
    } else if (hasComma && !hasPeriod) {
      // Only comma present - ambiguous case, use currency hint
      const afterComma = numberPart.slice(lastCommaIndex + 1);
      if (afterComma.length === 2 && /^\d{2}$/.test(afterComma)) {
        if (preferGermanFormat) {
          const cleaned = numberPart.replace(',', '.');
          normalizedValue = parseFloat(cleaned);
        } else {
          const cleaned = numberPart.replace(/,/g, '');
          normalizedValue = parseFloat(cleaned);
        }
      } else {
        const cleaned = numberPart.replace(/,/g, '');
        normalizedValue = parseFloat(cleaned);
      }
    } else if (hasPeriod && !hasComma) {
      // Only period present - ambiguous case, use currency hint
      const afterPeriod = numberPart.slice(lastPeriodIndex + 1);
      if (afterPeriod.length === 2 && /^\d{2}$/.test(afterPeriod)) {
        if (preferGermanFormat) {
          const cleaned = numberPart.replace(/\./g, '');
          normalizedValue = parseFloat(cleaned);
        } else {
          normalizedValue = parseFloat(numberPart);
        }
      } else if (afterPeriod.length === 3 && /^\d{3}$/.test(afterPeriod)) {
        const cleaned = numberPart.replace(/\./g, '');
        normalizedValue = parseFloat(cleaned);
      } else {
        normalizedValue = parseFloat(numberPart);
      }
    } else {
      normalizedValue = parseFloat(numberPart);
    }

    // Validate the parsed value
    if (!isNaN(normalizedValue) && normalizedValue > 0 && normalizedValue < 100000) {
      return { value: normalizedValue, currency };
    }
  }

  return null;
}

// =============================================================================
// URL Validation Logic Tests
// =============================================================================

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];

const BLOCKED_IP_PATTERNS = [
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^127\./, // 127.0.0.0/8
  /^169\.254\./, // Link-local
  /^fc00:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
];

/**
 * Replicated validateExtractionUrl function for testing purposes.
 */
function validateExtractionUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS (and HTTP for development)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return 'Only HTTP/HTTPS URLs are allowed';
    }

    // Block known internal hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return 'Internal URLs are not allowed';
    }

    // Block private IP ranges
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return 'Private network URLs are not allowed';
      }
    }

    // Block URLs with authentication credentials
    if (parsed.username || parsed.password) {
      return 'URLs with credentials are not allowed';
    }

    // Block non-standard ports (only 80, 443 allowed)
    const port = parsed.port;
    if (port && port !== '80' && port !== '443') {
      return 'Non-standard ports are not allowed';
    }

    return null; // URL is safe
  } catch {
    return 'Invalid URL format';
  }
}

// =============================================================================
// Price Parsing Tests
// =============================================================================

describe('Price Parsing', () => {
  // ===========================================================================
  // German Format Tests
  // ===========================================================================

  describe('German Format (EUR)', () => {
    it('should parse "299,95" (German decimal) for EUR', () => {
      const result = parsePrice('\u20AC299,95');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(299.95, 2);
      expect(result?.currency).toBe('EUR');
    });

    it('should parse "299,95" with EUR symbol after number', () => {
      const result = parsePrice('299,95 \u20AC');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(299.95, 2);
      expect(result?.currency).toBe('EUR');
    });

    it('should parse EUR text code', () => {
      const result = parsePrice('EUR 299,95');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(299.95, 2);
      expect(result?.currency).toBe('EUR');
    });

    it('should parse German thousands format: "1.299,00"', () => {
      const result = parsePrice('1.299,00 \u20AC');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(1299.0, 2);
      expect(result?.currency).toBe('EUR');
    });

    it('should parse larger German format: "12.345,67"', () => {
      const result = parsePrice('\u20AC12.345,67');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(12345.67, 2);
      expect(result?.currency).toBe('EUR');
    });

    it('should handle CHF with German format', () => {
      const result = parsePrice('CHF 149,00');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(149.0, 2);
      expect(result?.currency).toBe('CHF');
    });
  });

  // ===========================================================================
  // US/English Format Tests
  // ===========================================================================

  describe('US/English Format (USD)', () => {
    it('should parse "$199.99" (US decimal)', () => {
      const result = parsePrice('$199.99');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(199.99, 2);
      expect(result?.currency).toBe('USD');
    });

    it('should parse "USD 199.99"', () => {
      const result = parsePrice('USD 199.99');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(199.99, 2);
      expect(result?.currency).toBe('USD');
    });

    it('should parse US thousands format: "$1,234.56"', () => {
      const result = parsePrice('$1,234.56');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(1234.56, 2);
      expect(result?.currency).toBe('USD');
    });

    it('should parse "USD 1,234.56" with code prefix', () => {
      const result = parsePrice('USD 1,234.56');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(1234.56, 2);
      expect(result?.currency).toBe('USD');
    });

    it('should parse larger US format: "$12,345.67"', () => {
      const result = parsePrice('$12,345.67');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(12345.67, 2);
      expect(result?.currency).toBe('USD');
    });

    it('should handle GBP with English format', () => {
      const result = parsePrice('\u00A3149.00');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(149.0, 2);
      expect(result?.currency).toBe('GBP');
    });

    it('should parse GBP text code', () => {
      const result = parsePrice('GBP 249.99');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(249.99, 2);
      expect(result?.currency).toBe('GBP');
    });
  });

  // ===========================================================================
  // Ambiguous Format Resolution Tests
  // ===========================================================================

  describe('Ambiguous Format Resolution', () => {
    it('should treat comma as decimal for EUR (currency hint)', () => {
      // "99,95" could be US $9995 or EUR 99.95
      // With EUR symbol, should be treated as German format
      const result = parsePrice('\u20AC99,95');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(99.95, 2);
    });

    it('should treat comma as thousands for USD (currency hint)', () => {
      // "$1,234" - comma is thousands separator for USD
      const result = parsePrice('$1,234');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(1234, 2);
    });

    it('should handle period-only format for EUR as thousands', () => {
      // "1.234" with EUR - period is thousands (1234)
      // But only if exactly 3 digits after period
      const result = parsePrice('\u20AC1.234');
      expect(result).not.toBeNull();
      // EUR prefers German format, so 1.234 should be 1234
      expect(result?.value).toBeCloseTo(1234, 2);
    });

    it('should handle period-only format for USD as decimal', () => {
      // "$1.23" - period is decimal for USD
      const result = parsePrice('$1.23');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(1.23, 2);
    });
  });

  // ===========================================================================
  // Whole Number Tests
  // ===========================================================================

  describe('Whole Numbers', () => {
    it('should parse whole number with USD', () => {
      const result = parsePrice('$299');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(299);
      expect(result?.currency).toBe('USD');
    });

    it('should parse whole number with EUR', () => {
      const result = parsePrice('\u20AC199');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(199);
      expect(result?.currency).toBe('EUR');
    });

    it('should parse whole number with code suffix', () => {
      const result = parsePrice('299 USD');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(299);
      expect(result?.currency).toBe('USD');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should return null for text without price', () => {
      const result = parsePrice('This is just some text without a price');
      expect(result).toBeNull();
    });

    it('should return null for text with number but no currency', () => {
      const result = parsePrice('Weight: 299 grams');
      expect(result).toBeNull();
    });

    it('should return null for malformed price', () => {
      const result = parsePrice('$abc.def');
      expect(result).toBeNull();
    });

    it('should return null for negative-like values (no negative support)', () => {
      // The parser does not explicitly handle negative, but values must be > 0
      const result = parsePrice('Price: $0');
      expect(result).toBeNull();
    });

    it('should return null for extremely high prices (>100000)', () => {
      const result = parsePrice('$150,000.00');
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = parsePrice('');
      expect(result).toBeNull();
    });

    it('should handle whitespace-only string', () => {
      const result = parsePrice('   ');
      expect(result).toBeNull();
    });

    it('should parse first valid price when multiple exist', () => {
      const result = parsePrice('Was $299.99, now $199.99!');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(299.99, 2);
    });

    it('should handle price embedded in HTML-like text', () => {
      const result = parsePrice('<span class="price">$149.95</span>');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(149.95, 2);
    });

    it('should handle price with extra whitespace', () => {
      const result = parsePrice('Price:   $   299.99  ');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(299.99, 2);
    });
  });

  // ===========================================================================
  // Real-World Format Tests
  // ===========================================================================

  describe('Real-World Formats', () => {
    it('should parse German online shop format', () => {
      // Common format on German e-commerce sites
      const result = parsePrice('Preis: 449,95 \u20AC inkl. MwSt.');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(449.95, 2);
      expect(result?.currency).toBe('EUR');
    });

    it('should parse US retail format', () => {
      const result = parsePrice('Price: $349.99 (Free Shipping)');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(349.99, 2);
      expect(result?.currency).toBe('USD');
    });

    it('should parse UK format', () => {
      const result = parsePrice('Only \u00A3199.99!');
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(199.99, 2);
      expect(result?.currency).toBe('GBP');
    });

    it('should parse Swiss format', () => {
      const result = parsePrice("Prix: CHF 599,00");
      expect(result).not.toBeNull();
      expect(result?.value).toBeCloseTo(599.0, 2);
      expect(result?.currency).toBe('CHF');
    });
  });
});

// =============================================================================
// URL Validation Tests (SSRF Protection in Smart Product Search)
// =============================================================================

describe('URL Validation (SSRF Protection)', () => {
  describe('Private IP Blocking', () => {
    it('should block 10.x.x.x private IPs', () => {
      expect(validateExtractionUrl('http://10.0.0.1/product')).toBe(
        'Private network URLs are not allowed'
      );
      expect(validateExtractionUrl('http://10.255.255.255/test')).toBe(
        'Private network URLs are not allowed'
      );
    });

    it('should block 192.168.x.x private IPs', () => {
      expect(validateExtractionUrl('http://192.168.0.1/product')).toBe(
        'Private network URLs are not allowed'
      );
      expect(validateExtractionUrl('http://192.168.1.1/router')).toBe(
        'Private network URLs are not allowed'
      );
    });

    it('should block 172.16-31.x.x private IPs', () => {
      expect(validateExtractionUrl('http://172.16.0.1/product')).toBe(
        'Private network URLs are not allowed'
      );
      expect(validateExtractionUrl('http://172.31.255.255/api')).toBe(
        'Private network URLs are not allowed'
      );
    });
  });

  describe('Localhost Blocking', () => {
    it('should block 127.0.0.1', () => {
      // 127.0.0.1 is in BLOCKED_HOSTS list, so returns "Internal URLs are not allowed"
      expect(validateExtractionUrl('http://127.0.0.1/product')).toBe(
        'Internal URLs are not allowed'
      );
    });

    it('should block 127.x.x.x range via pattern', () => {
      // Other 127.x addresses are blocked via BLOCKED_IP_PATTERNS
      expect(validateExtractionUrl('http://127.0.0.2/product')).toBe(
        'Private network URLs are not allowed'
      );
      expect(validateExtractionUrl('http://127.255.255.255/test')).toBe(
        'Private network URLs are not allowed'
      );
    });

    it('should block localhost hostname', () => {
      expect(validateExtractionUrl('http://localhost/product')).toBe(
        'Internal URLs are not allowed'
      );
    });

    it('should block 0.0.0.0', () => {
      expect(validateExtractionUrl('http://0.0.0.0/product')).toBe(
        'Internal URLs are not allowed'
      );
    });

    it('should block IPv6 localhost with brackets', () => {
      // IPv6 addresses must use bracket notation in URLs
      expect(validateExtractionUrl('http://[::1]/product')).toBe(
        'Internal URLs are not allowed'
      );
    });

    it('should reject IPv6 localhost without brackets as invalid URL', () => {
      // ::1 without brackets is an invalid URL format
      expect(validateExtractionUrl('http://::1/product')).toBe(
        'Invalid URL format'
      );
    });
  });

  describe('Cloud Metadata Endpoint Blocking', () => {
    it('should block 169.254.169.254 (AWS/GCP metadata)', () => {
      expect(
        validateExtractionUrl('http://169.254.169.254/latest/meta-data/')
      ).toBe('Private network URLs are not allowed');
    });

    it('should block link-local range', () => {
      expect(validateExtractionUrl('http://169.254.0.1/product')).toBe(
        'Private network URLs are not allowed'
      );
    });
  });

  describe('Non-Standard Port Blocking', () => {
    it('should block non-standard ports', () => {
      expect(validateExtractionUrl('http://example.com:8080/product')).toBe(
        'Non-standard ports are not allowed'
      );
      expect(validateExtractionUrl('http://example.com:3000/api')).toBe(
        'Non-standard ports are not allowed'
      );
      expect(validateExtractionUrl('https://example.com:9000/test')).toBe(
        'Non-standard ports are not allowed'
      );
    });

    it('should allow standard ports', () => {
      expect(validateExtractionUrl('http://example.com:80/product')).toBeNull();
      expect(validateExtractionUrl('https://example.com:443/product')).toBeNull();
    });

    it('should allow implicit ports (no port specified)', () => {
      expect(validateExtractionUrl('http://example.com/product')).toBeNull();
      expect(validateExtractionUrl('https://example.com/product')).toBeNull();
    });
  });

  describe('Credential-Embedded URL Blocking', () => {
    it('should block URLs with username', () => {
      expect(validateExtractionUrl('http://user@example.com/product')).toBe(
        'URLs with credentials are not allowed'
      );
    });

    it('should block URLs with username and password', () => {
      expect(
        validateExtractionUrl('http://user:password@example.com/product')
      ).toBe('URLs with credentials are not allowed');
    });
  });

  describe('Protocol Validation', () => {
    it('should block non-HTTP protocols', () => {
      expect(validateExtractionUrl('ftp://example.com/file')).toBe(
        'Only HTTP/HTTPS URLs are allowed'
      );
      expect(validateExtractionUrl('file:///etc/passwd')).toBe(
        'Only HTTP/HTTPS URLs are allowed'
      );
      expect(
        validateExtractionUrl('javascript:alert(1)')
      ).toBe('Only HTTP/HTTPS URLs are allowed');
    });

    it('should allow HTTP and HTTPS', () => {
      expect(validateExtractionUrl('http://example.com/product')).toBeNull();
      expect(validateExtractionUrl('https://example.com/product')).toBeNull();
    });
  });

  describe('Valid Public URLs', () => {
    it('should allow legitimate public URLs', () => {
      expect(
        validateExtractionUrl('https://www.amazon.com/dp/B08N5WRWNW')
      ).toBeNull();
      expect(
        validateExtractionUrl('https://www.rei.com/product/123456/tent')
      ).toBeNull();
      expect(validateExtractionUrl('https://bergfreunde.de/product')).toBeNull();
    });

    it('should allow URLs with query parameters', () => {
      expect(
        validateExtractionUrl('https://example.com/search?q=tent&category=camping')
      ).toBeNull();
    });

    it('should allow URLs with fragments', () => {
      expect(
        validateExtractionUrl('https://example.com/product#specifications')
      ).toBeNull();
    });
  });

  describe('Invalid URL Format', () => {
    it('should reject malformed URLs', () => {
      expect(validateExtractionUrl('not-a-url')).toBe('Invalid URL format');
      expect(validateExtractionUrl('http://')).toBe('Invalid URL format');
      expect(validateExtractionUrl('')).toBe('Invalid URL format');
    });
  });
});
