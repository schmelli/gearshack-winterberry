/**
 * Client-side Community RAG Indexing Trigger
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * Lightweight client-side functions that fire-and-forget indexing
 * requests to the Community RAG API route. Called from bulletin
 * board hooks after post/reply creation/update/deletion.
 *
 * All calls are non-blocking and fail silently — indexing is
 * enrichment, not critical for post operations.
 */

interface IndexPostParams {
  source_id: string;
  content: string;
  tag?: string | null;
  author_name?: string;
  author_id?: string;
  created_at?: string;
}

interface IndexReplyParams {
  source_id: string;
  post_id: string;
  content: string;
  author_name?: string;
  author_id?: string;
  parent_post_content?: string;
  created_at?: string;
}

/**
 * Trigger indexing of a bulletin post into the community knowledge vector store.
 * Fire-and-forget — does not block or throw.
 */
export function triggerPostIndexing(params: IndexPostParams): void {
  fetch('/api/community-rag/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert',
      source_type: 'bulletin_post',
      source_id: params.source_id,
      content: params.content,
      tag: params.tag || null,
      author_name: params.author_name,
      author_id: params.author_id,
      created_at: params.created_at,
    }),
  }).catch((err: unknown) => {
    // Fire-and-forget: indexing is non-critical, but log for observability
    console.warn('[Community RAG] Post indexing trigger failed:', err instanceof Error ? err.message : String(err));
  });
}

/**
 * Trigger indexing of a bulletin reply into the community knowledge vector store.
 * Fire-and-forget — does not block or throw.
 */
export function triggerReplyIndexing(params: IndexReplyParams): void {
  fetch('/api/community-rag/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert',
      source_type: 'bulletin_reply',
      source_id: params.source_id,
      post_id: params.post_id,
      content: params.content,
      author_name: params.author_name,
      author_id: params.author_id,
      parent_post_content: params.parent_post_content,
      created_at: params.created_at,
    }),
  }).catch((err: unknown) => {
    // Fire-and-forget: indexing is non-critical, but log for observability
    console.warn('[Community RAG] Reply indexing trigger failed:', err instanceof Error ? err.message : String(err));
  });
}

/**
 * Trigger deletion of indexed content from the community knowledge store.
 * Called when a post or reply is soft-deleted.
 * Fire-and-forget — does not block or throw.
 */
export function triggerIndexDeletion(
  sourceType: 'bulletin_post' | 'bulletin_reply',
  sourceId: string
): void {
  fetch('/api/community-rag/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'delete',
      source_type: sourceType,
      source_id: sourceId,
    }),
  }).catch((err: unknown) => {
    // Fire-and-forget: deletion is non-critical, but log for observability
    console.warn('[Community RAG] Index deletion trigger failed:', err instanceof Error ? err.message : String(err));
  });
}
