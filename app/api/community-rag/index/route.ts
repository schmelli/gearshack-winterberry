/**
 * Community RAG Indexing API Route
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * POST /api/community-rag/index
 *
 * Indexes a single bulletin post or reply into the community knowledge
 * vector store. Called automatically when new posts/replies are created
 * or updated, enabling real-time RAG for the AI agent.
 *
 * Body:
 * {
 *   "action": "upsert" | "delete",
 *   "source_type": "bulletin_post" | "bulletin_reply",
 *   "source_id": "uuid",
 *   "content": "text content" (required for upsert),
 *   "tag": "question" | "gear_advice" | ... (optional, for posts),
 *   "author_name": "string" (optional),
 *   "author_id": "uuid" (optional),
 *   "parent_post_content": "string" (optional, for replies context),
 *   "created_at": "ISO string" (optional)
 * }
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  buildPostChunks,
  buildReplyChunks,
  generateChunkEmbeddings,
  upsertChunksWithEmbeddings,
  deleteChunksForSource,
} from '@/lib/community-rag';
import type { BulletinPostForIndexing, BulletinReplyForIndexing } from '@/lib/community-rag';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  try {
    // Authenticate - must be a logged-in user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, source_type, source_id } = body;

    if (!action || !source_type || !source_id) {
      return NextResponse.json(
        { error: 'Missing required fields: action, source_type, source_id' },
        { status: 400 }
      );
    }

    if (!['upsert', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "upsert" or "delete"' },
        { status: 400 }
      );
    }

    if (!['bulletin_post', 'bulletin_reply'].includes(source_type)) {
      return NextResponse.json(
        { error: 'Invalid source_type. Must be "bulletin_post" or "bulletin_reply"' },
        { status: 400 }
      );
    }

    // Validate source_id is a valid UUID to prevent malformed DB queries
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(source_id)) {
      return NextResponse.json(
        { error: 'Invalid source_id format. Must be a valid UUID.' },
        { status: 400 }
      );
    }

    // Verify ownership: the authenticated user must be the author of the source record.
    // This prevents a malicious user from overwriting or deleting embeddings for
    // content they don't own. Applies to BOTH upsert and delete actions.
    // Also guards against indexing soft-deleted content — both posts and replies
    // support soft deletion via the is_deleted flag.
    const ownershipTable =
      source_type === 'bulletin_post' ? 'bulletin_posts' : 'bulletin_replies';
    // Ownership check only needs id + author_id — reply_count is fetched separately
    // via a live COUNT from bulletin_replies (see below) to match the bulk indexer
    // and trigger approach, preventing stale denormalized values from overwriting
    // the trigger-maintained community_knowledge_chunks.reply_count on re-index.
    const { data: sourceRecord, error: ownerError } = await supabase
      .from(ownershipTable)
      .select('id, author_id')
      .eq('id', source_id)
      .eq('author_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (ownerError || !sourceRecord) {
      return NextResponse.json(
        { error: 'Forbidden: you are not the author of this content' },
        { status: 403 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Handle deletion
    if (action === 'delete') {
      await deleteChunksForSource(serviceClient, source_type, source_id);
      return NextResponse.json({ success: true, action: 'deleted' });
    }

    // Handle upsert
    const { content, tag, author_name, parent_post_content, created_at } = body;

    if (!content || typeof content !== 'string' || content.length < 20) {
      return NextResponse.json(
        { error: 'Content must be at least 20 characters for indexing' },
        { status: 400 }
      );
    }

    // Build chunks based on source type
    let chunks;

    if (source_type === 'bulletin_post') {
      // Fetch live reply count from source-of-truth (bulletin_replies) rather than reading
      // the denormalized bulletin_posts.reply_count cache.
      //
      // Why: the trigger in migration _002 maintains community_knowledge_chunks.reply_count
      // via a live COUNT(*) from bulletin_replies. If we read bulletin_posts.reply_count here
      // (a separately maintained denormalized cache), a re-index after the post received
      // replies could overwrite the accurate trigger-maintained count with a stale cached
      // value — defeating the purpose of the trigger.
      //
      // The extra COUNT query is lightweight (uses idx_bulletin_replies_post_id_active).
      // Graceful fallback to 0 if the query fails — indexing always completes.
      const { count: liveReplyCount, error: replyCountError } = await serviceClient
        .from('bulletin_replies')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', source_id)
        .eq('is_deleted', false);

      if (replyCountError) {
        console.warn(
          `[Community RAG] Could not fetch live reply count for post ${source_id}, falling back to 0:`,
          replyCountError.message
        );
      }

      const post: BulletinPostForIndexing = {
        id: source_id,
        content,
        tag: tag || null,
        author_id: user.id,
        created_at: created_at || new Date().toISOString(),
        author_name: author_name || undefined,
        reply_count: liveReplyCount ?? 0,
      };
      chunks = buildPostChunks(post);
    } else {
      if (!body.post_id || typeof body.post_id !== 'string' || !UUID_REGEX.test(body.post_id)) {
        return NextResponse.json(
          { error: 'Missing or invalid post_id for bulletin_reply. Must be a valid UUID.' },
          { status: 400 }
        );
      }
      const reply: BulletinReplyForIndexing = {
        id: source_id,
        post_id: body.post_id,
        content,
        author_id: user.id,
        created_at: created_at || new Date().toISOString(),
        author_name: author_name || undefined,
      };
      chunks = buildReplyChunks(reply, parent_post_content);
    }

    if (chunks.length === 0) {
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: 'Content too short for indexing',
      });
    }

    // Generate embeddings
    const texts = chunks.map(c => c.chunk_text);
    const embeddings = await generateChunkEmbeddings(texts);

    // Upsert into Supabase
    const result = await upsertChunksWithEmbeddings(serviceClient, chunks, embeddings);

    return NextResponse.json({
      success: result.indexed > 0,
      action: 'indexed',
      indexed: result.indexed,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[Community RAG] Index API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during indexing' },
      { status: 500 }
    );
  }
}
