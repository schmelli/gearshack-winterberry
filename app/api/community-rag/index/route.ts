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

    // Verify ownership: the authenticated user must be the author of the source record.
    // This prevents a malicious user from overwriting embeddings for content they don't own.
    const ownershipTable =
      source_type === 'bulletin_post' ? 'bulletin_posts' : 'bulletin_replies';
    const { data: sourceRecord, error: ownerError } = await supabase
      .from(ownershipTable)
      .select('id, author_id')
      .eq('id', source_id)
      .eq('author_id', user.id)
      .single();

    if (ownerError || !sourceRecord) {
      return NextResponse.json(
        { error: 'Forbidden: you are not the author of this content' },
        { status: 403 }
      );
    }

    // Build chunks based on source type
    let chunks;

    if (source_type === 'bulletin_post') {
      const post: BulletinPostForIndexing = {
        id: source_id,
        content,
        tag: tag || null,
        author_id: user.id,
        created_at: created_at || new Date().toISOString(),
        author_name: author_name || undefined,
      };
      chunks = buildPostChunks(post);
    } else {
      if (!body.post_id || typeof body.post_id !== 'string') {
        return NextResponse.json(
          { error_code: 'MISSING_OR_INVALID_POST_ID' },
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
