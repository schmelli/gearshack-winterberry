/**
 * AI Assistant Streaming API Route - DEPRECATED
 *
 * This route has been consolidated into /api/mastra/chat which provides:
 * - Three-tier memory system (working, conversation history, semantic)
 * - 10+ tools (vs 3 in the old implementation)
 * - Intent classification and parallel prefetch
 * - Structured observability with metrics and tracing
 * - GDPR-compliant memory deletion
 *
 * All clients should use /api/mastra/chat directly via the useMastraChat hook.
 * This route issues a 308 Permanent Redirect to preserve the POST method and body.
 *
 * @deprecated Use /api/mastra/chat instead
 */

const MASTRA_CHAT_PATH = '/api/mastra/chat';

export async function POST(request: Request) {
  // Build redirect URL from origin only — do NOT preserve query params from the
  // original request, as they were specific to the old streaming endpoint schema.
  const redirectUrl = new URL(MASTRA_CHAT_PATH, request.url);
  return new Response(null, {
    status: 308,
    headers: {
      Location: redirectUrl.toString(),
      Deprecation: 'true',
      Link: `<${MASTRA_CHAT_PATH}>; rel="successor-version"`,
      'Sunset': 'Sat, 01 Aug 2026 00:00:00 GMT',
    },
  });
}
