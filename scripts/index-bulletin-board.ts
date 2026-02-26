/**
 * Bulletin Board Post Indexing Script
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * Indexes all active bulletin board posts and replies into pgvector
 * for semantic search by the AI agent. Run this script to:
 * 1. Backfill existing posts/replies into the community_knowledge_chunks table
 * 2. Re-index all content (e.g., after embedding model changes)
 *
 * Usage:
 *   npx tsx scripts/index-bulletin-board.ts [--force] [--posts-only] [--replies-only]
 *
 * Options:
 *   --force         Re-index all content even if already indexed
 *   --posts-only    Only index posts (skip replies)
 *   --replies-only  Only index replies (skip posts)
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           AI_GATEWAY_API_KEY (or AI_GATEWAY_KEY) in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { embedMany } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import fs from 'fs';
import path from 'path';
import { extractBrandNames, extractGearNames } from '../lib/community-rag/chunker';
import { COMMUNITY_RAG_CONFIG } from '../lib/community-rag/types';

// --- Zero-Dependency Env Loader (same pattern as seed-ontology.ts) ---
function loadEnv(filename: string) {
  try {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      if (!line || line.startsWith('#') || !line.includes('=')) return;
      const [key, ...values] = line.split('=');
      const value = values.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    });
    console.log(`✅ Loaded env from ${filename}`);
  } catch {
    console.warn(`⚠️ Could not load ${filename}`);
  }
}

loadEnv('.env.local');

// ============================================================================
// Configuration
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const aiGatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!aiGatewayKey) {
  console.error('❌ Missing AI Gateway key in .env.local');
  console.error('   Required: AI_GATEWAY_API_KEY or AI_GATEWAY_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const gateway = createGateway({ apiKey: aiGatewayKey });
const embeddingModel = gateway.textEmbeddingModel('openai/text-embedding-3-small');

const BATCH_SIZE = COMMUNITY_RAG_CONFIG.BATCH_SIZE;
const MIN_CONTENT_LENGTH = COMMUNITY_RAG_CONFIG.MIN_CONTENT_LENGTH;

// Parse CLI args
const args = process.argv.slice(2);
const forceReindex = args.includes('--force');
const postsOnly = args.includes('--posts-only');
const repliesOnly = args.includes('--replies-only');

// ============================================================================
// Indexing Functions
// ============================================================================

interface ChunkRecord {
  source_type: string;
  source_id: string;
  chunk_text: string;
  chunk_index: number;
  author_id: string | null;
  tags: string[];
  gear_names: string[];
  brand_names: string[];
  source_created_at: string | null;
  reply_count: number;
}

async function getExistingSourceIds(sourceType: string): Promise<Set<string>> {
  if (forceReindex) return new Set();

  const { data } = await supabase
    .from('community_knowledge_chunks')
    .select('source_id')
    .eq('source_type', sourceType);

  return new Set((data || []).map(r => r.source_id));
}

async function indexPosts(): Promise<{ indexed: number; skipped: number; failed: number }> {
  console.log('\n📝 Indexing bulletin board posts...');

  const existingIds = await getExistingSourceIds('bulletin_post');

  // Fetch active posts
  const { data: posts, error } = await supabase
    .from('v_bulletin_posts_with_author')
    .select('id, content, tag, author_id, author_name, created_at, reply_count')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch posts:', error.message);
    return { indexed: 0, skipped: 0, failed: 0 };
  }

  const allPosts = posts || [];
  console.log(`   Found ${allPosts.length} active posts`);

  // Build chunks
  const chunks: ChunkRecord[] = [];
  let skipped = 0;

  for (const post of allPosts) {
    if (!forceReindex && existingIds.has(post.id)) {
      skipped++;
      continue;
    }

    if ((post.content as string).length < MIN_CONTENT_LENGTH) {
      skipped++;
      continue;
    }

    const tagLabel = post.tag ? ` [${post.tag}]` : '';
    const authorLabel = post.author_name ? ` by ${post.author_name}` : '';
    const chunkText = `[Community Post${tagLabel}${authorLabel}]\n${post.content}`;

    chunks.push({
      source_type: 'bulletin_post',
      source_id: post.id,
      chunk_text: chunkText,
      chunk_index: 0,
      author_id: post.author_id,
      tags: post.tag ? [post.tag] : [],
      gear_names: extractGearNames(post.content as string),
      brand_names: extractBrandNames(post.content as string),
      source_created_at: post.created_at,
      reply_count: (post.reply_count as number) ?? 0,
    });
  }

  console.log(`   ${chunks.length} posts to index, ${skipped} skipped (already indexed)`);

  // Embed and upsert in batches
  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.chunk_text);

    try {
      const { embeddings } = await embedMany({ model: embeddingModel, values: texts });

      const records = batch.map((chunk, idx) => ({
        ...chunk,
        embedding: `[${embeddings[idx].join(',')}]`,
        indexed_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('community_knowledge_chunks')
        .upsert(records, { onConflict: 'source_type,source_id,chunk_index' });

      if (upsertError) {
        console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} upsert error:`, upsertError.message);
        failed += batch.length;
      } else {
        indexed += batch.length;
        process.stdout.write(`   ✅ Indexed ${indexed}/${chunks.length} posts\r`);
      }
    } catch (err) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} embedding error:`,
        err instanceof Error ? err.message : 'Unknown');
      failed += batch.length;
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n   Posts: ${indexed} indexed, ${skipped} skipped, ${failed} failed`);
  return { indexed, skipped, failed };
}

async function indexReplies(): Promise<{ indexed: number; skipped: number; failed: number }> {
  console.log('\n💬 Indexing bulletin board replies...');

  const existingIds = await getExistingSourceIds('bulletin_reply');

  // Fetch replies with their parent post content for context (exclude soft-deleted)
  const { data: replies, error } = await supabase
    .from('v_bulletin_replies_with_author')
    .select('id, post_id, content, author_id, author_name, created_at')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch replies:', error.message);
    return { indexed: 0, skipped: 0, failed: 0 };
  }

  const allReplies = replies || [];
  console.log(`   Found ${allReplies.length} active replies`);

  // Fetch parent post content for context (unique post IDs)
  const postIds = [...new Set(allReplies.map(r => r.post_id))];
  const postContentMap = new Map<string, string>();

  if (postIds.length > 0) {
    // Fetch in batches of 100
    for (let i = 0; i < postIds.length; i += 100) {
      const batch = postIds.slice(i, i + 100);
      const { data: posts } = await supabase
        .from('bulletin_posts')
        .select('id, content')
        .in('id', batch);

      if (posts) {
        for (const p of posts) {
          postContentMap.set(p.id, p.content as string);
        }
      }
    }
  }

  // Build chunks
  const chunks: ChunkRecord[] = [];
  let skipped = 0;

  for (const reply of allReplies) {
    if (!forceReindex && existingIds.has(reply.id)) {
      skipped++;
      continue;
    }

    if ((reply.content as string).length < MIN_CONTENT_LENGTH) {
      skipped++;
      continue;
    }

    const authorLabel = reply.author_name ? ` by ${reply.author_name}` : '';
    const parentContent = postContentMap.get(reply.post_id);
    const contextSnippet = parentContent
      ? `\nRe: "${parentContent.slice(0, 150)}${parentContent.length > 150 ? '...' : ''}"`
      : '';

    const chunkText = `[Community Reply${authorLabel}]${contextSnippet}\n${reply.content}`;

    chunks.push({
      source_type: 'bulletin_reply',
      source_id: reply.id,
      chunk_text: chunkText,
      chunk_index: 0,
      author_id: reply.author_id,
      tags: [],
      gear_names: extractGearNames(reply.content as string),
      brand_names: extractBrandNames(reply.content as string),
      source_created_at: reply.created_at,
      reply_count: 0,
    });
  }

  console.log(`   ${chunks.length} replies to index, ${skipped} skipped`);

  // Embed and upsert in batches
  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.chunk_text);

    try {
      const { embeddings } = await embedMany({ model: embeddingModel, values: texts });

      const records = batch.map((chunk, idx) => ({
        ...chunk,
        embedding: `[${embeddings[idx].join(',')}]`,
        indexed_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('community_knowledge_chunks')
        .upsert(records, { onConflict: 'source_type,source_id,chunk_index' });

      if (upsertError) {
        console.error(`   ❌ Batch upsert error:`, upsertError.message);
        failed += batch.length;
      } else {
        indexed += batch.length;
        process.stdout.write(`   ✅ Indexed ${indexed}/${chunks.length} replies\r`);
      }
    } catch (err) {
      console.error(`   ❌ Batch embedding error:`,
        err instanceof Error ? err.message : 'Unknown');
      failed += batch.length;
    }

    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n   Replies: ${indexed} indexed, ${skipped} skipped, ${failed} failed`);
  return { indexed, skipped, failed };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🧠 Community RAG — Bulletin Board Indexing');
  console.log('==========================================');
  console.log(`   Force re-index: ${forceReindex}`);
  console.log(`   Posts: ${repliesOnly ? 'skip' : 'index'}`);
  console.log(`   Replies: ${postsOnly ? 'skip' : 'index'}`);

  let totalIndexed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  if (!repliesOnly) {
    const postResult = await indexPosts();
    totalIndexed += postResult.indexed;
    totalSkipped += postResult.skipped;
    totalFailed += postResult.failed;
  }

  if (!postsOnly) {
    const replyResult = await indexReplies();
    totalIndexed += replyResult.indexed;
    totalSkipped += replyResult.skipped;
    totalFailed += replyResult.failed;
  }

  console.log('\n==========================================');
  console.log(`✅ Done! ${totalIndexed} chunks indexed, ${totalSkipped} skipped, ${totalFailed} failed`);

  // Show final count
  const { count } = await supabase
    .from('community_knowledge_chunks')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total chunks in community_knowledge_chunks: ${count}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
