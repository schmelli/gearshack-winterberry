/**
 * Conversation History API Route
 * Loads conversation history for AI Assistant persistence
 *
 * This endpoint fetches the last 50 messages from a conversation
 * to restore context when the AI panel is reopened.
 *
 * NOTE: Limited to the last HISTORY_LIMIT messages. Older messages are
 * silently dropped. If a conversation exceeds this limit, only the most
 * recent messages are restored.
 * TODO: Add pagination or a truncation indicator in the response if
 * conversations regularly exceed HISTORY_LIMIT messages.
 */

import { createClient } from '@/lib/supabase/server';
import { logError, logDebug } from '@/lib/mastra/logging';
import { checkAndIncrementRateLimit } from '@/lib/mastra/rate-limiter';

export const runtime = 'nodejs';

const HISTORY_LIMIT = 50;

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logError('Failed to parse request body');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate request
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const request_data = body as Record<string, unknown>;
    if (typeof request_data.conversationId !== 'string' || !request_data.conversationId) {
      return new Response(
        JSON.stringify({ error: 'conversationId is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const conversationId = request_data.conversationId;

    // 3. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logError('Authentication failed', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Rate limiting - consistent with chat endpoint
    const rateLimitResult = await checkAndIncrementRateLimit(user.id, 'simple_query');
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(rateLimitResult.limit ?? 'unlimited'),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 5. Fetch conversation history
    // Security: ai_messages does not have user_id; join with ai_conversations to verify ownership.
    // Order descending to get the LAST HISTORY_LIMIT messages, then reverse in-app for
    // chronological order.
    logDebug('Fetching conversation history', {
      userId: user.id,
      conversationId,
      metadata: { limit: HISTORY_LIMIT },
    });

    const { data: messages, error: fetchError } = await supabase
      .from('ai_messages')
      .select('id, role, content, created_at, ai_conversations!inner(user_id)')
      .eq('conversation_id', conversationId)
      .eq('ai_conversations.user_id', user.id) // Security: only fetch messages belonging to this user
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (fetchError) {
      logError('Failed to fetch conversation history', new Error(fetchError.message), {
        userId: user.id,
        conversationId,
      });
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversation history' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ messages: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reverse to restore chronological order (oldest first)
    const chronologicalMessages = messages
      .reverse()
      .map(({ id, role, content, created_at }) => ({ id, role, content, created_at }));

    return new Response(
      JSON.stringify({ messages: chronologicalMessages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('Conversation history request failed', error instanceof Error ? error : undefined);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
