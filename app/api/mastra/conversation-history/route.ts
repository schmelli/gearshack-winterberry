/**
 * Conversation History API Route
 * Loads conversation history for AI Assistant persistence
 *
 * This endpoint fetches the last 50 messages from a conversation
 * to restore context when the AI panel is reopened.
 */

import { createClient } from '@/lib/supabase/server';
import { logError, logDebug } from '@/lib/mastra/logging';

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

    // 4. Fetch conversation history
    logDebug('Fetching conversation history', {
      userId: user.id,
      conversationId,
      metadata: { limit: HISTORY_LIMIT },
    });

    const { data: messages, error: fetchError } = await supabase
      .from('ai_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id) // Security: only fetch user's own messages
      .order('created_at', { ascending: true })
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

    return new Response(
      JSON.stringify({ messages: messages || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Conversation history request failed', error instanceof Error ? error : undefined);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
