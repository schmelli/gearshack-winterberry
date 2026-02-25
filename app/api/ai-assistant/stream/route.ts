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

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/api/mastra/chat';
  return Response.redirect(url.toString(), 308);
}
