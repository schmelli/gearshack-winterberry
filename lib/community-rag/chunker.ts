/**
 * Content Chunker for Community RAG
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * Prepares community content (bulletin posts, replies) for vector embedding
 * by chunking long content, extracting metadata, and formatting for indexing.
 */

import type {
  CommunityChunk,
  BulletinPostForIndexing,
  BulletinReplyForIndexing,
} from './types';
import { COMMUNITY_RAG_CONFIG } from './types';

// ============================================================================
// Known Gear Brands (for metadata extraction)
// ============================================================================

const KNOWN_BRANDS = [
  'Therm-a-Rest', 'NeoAir', 'MSR', 'Jetboil', 'Big Agnes', 'Nemo',
  'Hilleberg', 'Zpacks', 'Gossamer Gear', 'ULA', 'Granite Gear',
  'Osprey', 'Gregory', 'Deuter', 'Arc\'teryx', 'Patagonia',
  'Mountain Hardwear', 'Sea to Summit', 'Exped',
  'Western Mountaineering', 'Enlightened Equipment', 'Katabatic',
  'Nunatak', 'Tarptent', 'Six Moon Designs', 'Sierra Designs',
  'REI', 'Black Diamond', 'Petzl', 'Salomon', 'La Sportiva',
  'Scarpa', 'Merrell', 'Altra', 'Hoka', 'Brooks', 'Sawyer',
  'Katadyn', 'Platypus', 'BeFree', 'Cnoc', 'Garmin', 'Suunto',
  'Trail Designs', 'Toaks', 'Snow Peak', 'Soto', 'BRS',
  'Cumulus', 'Pajak', 'Rab', 'Montbell', 'Klymit',
  'Nalgene', 'Hydrapak', 'Evernew', 'Hennessy', 'Warbonnet',
  'Hammock Gear', 'Dutch', 'Thinlight', 'GG', 'HMG',
  'Hyperlite Mountain Gear', 'MLD', 'Mountain Laurel Designs',
  'Locus Gear', 'Yama', 'Borah', 'EE', 'WM', 'FF', 'Feathered Friends',
];

// ============================================================================
// Metadata Extraction
// ============================================================================

/**
 * Extract brand names mentioned in text content
 */
export function extractBrandNames(text: string): string[] {
  const textLower = text.toLowerCase();
  return KNOWN_BRANDS.filter(brand =>
    textLower.includes(brand.toLowerCase())
  );
}

/**
 * Extract potential gear item names from text using common patterns.
 * Looks for capitalized multi-word sequences that likely reference products.
 */
export function extractGearNames(text: string): string[] {
  const gearNames: string[] = [];

  // Match patterns like "Brand + Product Name" (e.g., "NeoAir XLite", "MSR PocketRocket")
  const productPattern = /(?:^|\s)([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z0-9]*){1,3})(?:\s|[.,;!?]|$)/g;
  let match;
  while ((match = productPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    // Filter out common non-product phrases
    if (candidate.length > 3 && !isCommonPhrase(candidate)) {
      gearNames.push(candidate);
    }
  }

  return [...new Set(gearNames)].slice(0, 10); // Deduplicate, max 10
}

const COMMON_PHRASES = new Set([
  'The', 'This', 'That', 'What', 'When', 'Where', 'Which', 'How',
  'I Have', 'My', 'Your', 'Community Post', 'Bulletin Reply',
  'Great', 'Good', 'Best', 'Just', 'Really', 'Very',
]);

function isCommonPhrase(text: string): boolean {
  return COMMON_PHRASES.has(text);
}

// ============================================================================
// Content Chunking
// ============================================================================

/**
 * Split text into overlapping chunks for embedding.
 * Short texts (<= MAX_CHUNK_SIZE) are returned as a single chunk.
 */
export function chunkText(
  text: string,
  maxSize = COMMUNITY_RAG_CONFIG.MAX_CHUNK_SIZE,
  overlap = COMMUNITY_RAG_CONFIG.CHUNK_OVERLAP
): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;

    // Try to break at sentence or paragraph boundary
    if (end < text.length) {
      const breakPoint = findNaturalBreak(text, start + maxSize - 200, end);
      if (breakPoint > start) {
        end = breakPoint;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(c => c.length >= COMMUNITY_RAG_CONFIG.MIN_CONTENT_LENGTH);
}

/**
 * Find a natural break point (sentence end, paragraph) in the given range
 */
function findNaturalBreak(text: string, from: number, to: number): number {
  // Look for paragraph breaks first
  const paragraphBreak = text.lastIndexOf('\n\n', to);
  if (paragraphBreak >= from) return paragraphBreak + 2;

  // Then sentence ends
  const sentenceBreak = text.lastIndexOf('. ', to);
  if (sentenceBreak >= from) return sentenceBreak + 2;

  // Then single newlines
  const lineBreak = text.lastIndexOf('\n', to);
  if (lineBreak >= from) return lineBreak + 1;

  return to;
}

// ============================================================================
// Chunk Builders
// ============================================================================

/**
 * Build chunks from a bulletin board post
 */
export function buildPostChunks(post: BulletinPostForIndexing): CommunityChunk[] {
  if (post.content.length < COMMUNITY_RAG_CONFIG.MIN_CONTENT_LENGTH) {
    return [];
  }

  const tagLabel = post.tag ? ` [${post.tag}]` : '';
  const authorLabel = post.author_name ? ` by ${post.author_name}` : '';
  const prefix = `[Community Post${tagLabel}${authorLabel}]\n`;

  const fullText = `${prefix}${post.content}`;
  const textChunks = chunkText(fullText);

  const brandNames = extractBrandNames(post.content);
  const gearNames = extractGearNames(post.content);
  const tags = post.tag ? [post.tag] : [];

  return textChunks.map((chunk, index) => ({
    source_type: 'bulletin_post' as const,
    source_id: post.id,
    chunk_text: chunk,
    chunk_index: index,
    author_id: post.author_id,
    tags,
    gear_names: gearNames,
    brand_names: brandNames,
    source_created_at: post.created_at,
    reply_count: post.reply_count ?? 0,
  }));
}

/**
 * Build chunks from a bulletin board reply
 */
export function buildReplyChunks(
  reply: BulletinReplyForIndexing,
  parentPostContent?: string
): CommunityChunk[] {
  if (reply.content.length < COMMUNITY_RAG_CONFIG.MIN_CONTENT_LENGTH) {
    return [];
  }

  const authorLabel = reply.author_name ? ` by ${reply.author_name}` : '';
  // Include a snippet of the parent post for context
  const contextSnippet = parentPostContent
    ? `\nRe: "${parentPostContent.slice(0, 150)}${parentPostContent.length > 150 ? '...' : ''}"`
    : '';
  const prefix = `[Community Reply${authorLabel}]${contextSnippet}\n`;

  const fullText = `${prefix}${reply.content}`;
  const textChunks = chunkText(fullText);

  const brandNames = extractBrandNames(reply.content);
  const gearNames = extractGearNames(reply.content);

  return textChunks.map((chunk, index) => ({
    source_type: 'bulletin_reply' as const,
    source_id: reply.id,
    chunk_text: chunk,
    chunk_index: index,
    author_id: reply.author_id,
    tags: [],
    gear_names: gearNames,
    brand_names: brandNames,
    source_created_at: reply.created_at,
    reply_count: 0, // Replies don't have their own reply count
  }));
}
