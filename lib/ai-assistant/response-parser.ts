/**
 * AI Response Parser
 * Feature 050: AI Assistant - T059
 *
 * Extracts structured data (inline cards, actions) from AI text responses
 * and AI SDK tool calls.
 */

import type { InlineCard, Action } from '@/types/ai-assistant';

/**
 * T059: Parse AI response text and tool calls to extract inline cards and actions
 *
 * @param responseText - Raw text from AI model
 * @param toolCalls - Tool calls from Vercel AI SDK (optional)
 * @returns Parsed response with extracted cards and actions
 */
export function parseAIResponse(
  responseText: string,
  toolCalls?: any[]
): {
  cleanText: string;
  inlineCards: InlineCard[];
  actions: Action[];
} {
  const inlineCards: InlineCard[] = [];
  const actions: Action[] = [];

  // T059: Extract actions from AI SDK tool calls
  if (toolCalls && toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      const action = extractActionFromToolCall(toolCall);
      if (action) {
        actions.push(action);
      }
    }
  }

  return {
    cleanText: responseText,
    inlineCards,
    actions,
  };
}

/**
 * T059: Extract Action object from Vercel AI SDK tool call
 *
 * Maps tool calls to Action type format for database storage and UI rendering.
 *
 * @param toolCall - Tool call object from AI SDK
 * @returns Action object or null if invalid
 */
function extractActionFromToolCall(toolCall: any): Action | null {
  if (!toolCall || !toolCall.toolName || !toolCall.args) {
    return null;
  }

  const { toolName, args } = toolCall;

  switch (toolName) {
    case 'addToWishlist':
      return {
        type: 'add_to_wishlist',
        gearItemId: args.gearItemId,
        status: 'pending',
        error: null,
      };

    case 'compareGear':
      return {
        type: 'compare',
        gearItemIds: args.gearItemIds || [],
        status: 'pending',
        error: null,
      };

    case 'sendMessage':
      return {
        type: 'send_message',
        recipientUserId: args.recipientUserId,
        messagePreview: args.messagePreview || '',
        status: 'pending',
        error: null,
      };

    case 'navigate':
      return {
        type: 'navigate',
        destination: args.destination,
        status: 'pending',
        error: null,
      };

    // searchCommunity tool doesn't map to an Action - it returns inline cards instead
    case 'searchCommunity':
      // TODO: Could extract inline cards here in future
      return null;

    // =========================================================================
    // Phase 3: New tools - these return data, not UI actions
    // =========================================================================

    // searchCatalog returns catalog search results (data tool)
    case 'searchCatalog':
      // Data tool - results are used by AI to formulate response
      return null;

    // analyzeInventory returns inventory analysis (data tool)
    case 'analyzeInventory':
      // Data tool - results are used by AI to formulate response
      return null;

    // compareItems returns comparison data (could trigger compare UI in future)
    case 'compareItems':
      // If we have item IDs, we could map this to a compare action
      if (args.itemIds && Array.isArray(args.itemIds) && args.itemIds.length >= 2) {
        return {
          type: 'compare',
          gearItemIds: args.itemIds,
          status: 'pending',
          error: null,
        };
      }
      return null;

    // getCommunityOffers returns community availability (data tool)
    case 'getCommunityOffers':
      // Data tool - results are used by AI to formulate response
      return null;

    // getInsights returns GearGraph insights (data tool)
    case 'getInsights':
      // Data tool - results are used by AI to formulate response
      return null;

    // executeCalculation performs math operations (data tool)
    case 'executeCalculation':
      // Data tool - results are used by AI to formulate response
      return null;

    // searchWeb performs web search (data tool - Phase 2B)
    case 'searchWeb':
      // Data tool - results are used by AI to formulate response
      return null;

    default:
      console.warn(`Unknown tool call: ${toolName}`);
      return null;
  }
}

/**
 * Detect if AI response contains a gear recommendation pattern
 *
 * Example patterns to detect:
 * - "I recommend the [Brand Name] [Product Name] because..."
 * - "Consider the X which weighs Y grams..."
 * - "A lighter alternative would be..."
 *
 * @param text - AI response text
 * @returns True if recommendation pattern detected
 */
export function containsGearRecommendation(text: string): boolean {
  const patterns = [
    /\brecommend\s+the\s+[\w\s]+/i,
    /\bconsider\s+the\s+[\w\s]+/i,
    /\blighter\s+alternative/i,
    /\bempfehle\s+(ich\s+)?die\s+[\w\s]+/i, // German
    /\bleichter(e)?\s+alternative/i, // German
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Detect if AI response suggests a comparison action
 *
 * Example patterns:
 * - "Let me compare..."
 * - "Comparing X vs Y..."
 * - "Here's how they differ..."
 *
 * @param text - AI response text
 * @returns True if comparison pattern detected
 */
export function containsComparisonIntent(text: string): boolean {
  const patterns = [
    /\bcompare\s+/i,
    /\bcomparison\s+/i,
    /\bvs\b/i,
    /\bvergleich/i, // German
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Detect if AI response suggests navigation
 *
 * Example patterns:
 * - "You can find this in..."
 * - "Go to your inventory..."
 * - "Check your loadout..."
 *
 * @param text - AI response text
 * @returns True if navigation pattern detected
 */
export function containsNavigationIntent(text: string): boolean {
  const patterns = [
    /\bgo\s+to\s+/i,
    /\bcheck\s+your\s+/i,
    /\bfind\s+(this\s+)?in\s+/i,
    /\bgehe\s+zu/i, // German
    /\bschau\s+in/i, // German
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Extract potential gear item references from text
 *
 * Looks for patterns like:
 * - "your [item name]"
 * - "the [brand] [product]"
 *
 * @param text - AI response text
 * @returns Array of potential gear item mentions
 */
export function extractGearMentions(text: string): string[] {
  const mentions: string[] = [];

  // Pattern: "your [item]" - e.g., "your tent", "your sleeping bag"
  const yourPattern = /\byour\s+([\w\s]{3,30}?)(?=\b|\.|,|!|\?)/gi;
  let match;
  while ((match = yourPattern.exec(text)) !== null) {
    mentions.push(match[1].trim());
  }

  // Pattern: "the [Brand] [Product]" - e.g., "the Big Agnes Copper Spur"
  const brandPattern = /\bthe\s+([A-Z][\w\s]{3,40}?)(?=\b|\.|,|!|\?)/g;
  while ((match = brandPattern.exec(text)) !== null) {
    const mention = match[1].trim();
    // Filter out common false positives
    if (
      !mention.match(/^(The|This|That|These|Those|There|Here)\b/i) &&
      mention.length > 5
    ) {
      mentions.push(mention);
    }
  }

  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Sanitize AI response text
 *
 * - Remove any accidental API keys or sensitive data
 * - Strip excessive whitespace
 * - Ensure proper character encoding
 *
 * @param text - Raw AI response
 * @returns Sanitized text safe for display
 */
export function sanitizeResponse(text: string): string {
  // Remove potential API keys (pattern: sk-... or similar)
  let sanitized = text.replace(/\b[a-z]{2}-[a-zA-Z0-9]{32,}\b/gi, '[REDACTED]');

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Ensure no control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized;
}
